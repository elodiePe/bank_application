import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createMoneyRequestService, type MoneyRequestService } from './moneyRequestService.js';
import { ForbiddenError, InsufficientFundsError, InvalidRequestStateError } from '../utils/errors.js';

describe('moneyRequestService (seeded demo family)', () => {
  let db: TestDb;
  let service: MoneyRequestService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createMoneyRequestService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('a child creates a deposit request targeting no one in particular ("the parents")', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 2000,
      comment: 'Pour un livre',
    });

    expect(request).toMatchObject({
      requesterFirstName: 'Elodie',
      targetUserId: null,
      status: 'PENDING',
      amountCents: 2000,
    });
  });

  it('any parent can approve a deposit request, crediting the requester', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 1500,
    });
    const before = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });

    const approved = await service.approve({
      requestId: request.id,
      actorId: 'demo-maman',
      actorRole: 'PARENT',
      actorFamilyId: 'demo-family',
    });

    expect(approved).toMatchObject({ status: 'APPROVED', respondedByFirstName: 'Maman' });
    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });
    expect(after.balanceCents).toBe(before.balanceCents + 1500);
  });

  it('a parent can reject a withdrawal request with no balance change', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'WITHDRAWAL_REQUEST',
      amountCents: 500,
    });
    const before = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });

    const rejected = await service.reject({
      requestId: request.id,
      actorId: 'demo-papa',
      actorRole: 'PARENT',
      actorFamilyId: 'demo-family',
    });

    expect(rejected.status).toBe('REJECTED');
    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });
    expect(after.balanceCents).toBe(before.balanceCents);
  });

  it('a child cannot approve a deposit/withdrawal request (parents only)', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 100,
    });

    await expect(
      service.approve({
        requestId: request.id,
        actorId: 'demo-matthieu',
        actorRole: 'CHILD',
        actorFamilyId: 'demo-family',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('a sibling transfer request is only approvable by the targeted sibling', async () => {
    await db.prisma.childAccount.update({
      where: { userId: 'demo-matthieu' },
      data: { balanceCents: { increment: 5000 } },
    });

    const request = await service.createRequest({
      requesterId: 'demo-damien',
      familyId: 'demo-family',
      type: 'TRANSFER_REQUEST',
      amountCents: 1000,
      targetUserId: 'demo-matthieu',
    });

    await expect(
      service.approve({
        requestId: request.id,
        actorId: 'demo-elodie',
        actorRole: 'CHILD',
        actorFamilyId: 'demo-family',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // A parent can't approve it on the sibling's behalf either.
    await expect(
      service.approve({
        requestId: request.id,
        actorId: 'demo-papa',
        actorRole: 'PARENT',
        actorFamilyId: 'demo-family',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const damienBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    const matthieuBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-matthieu' } });

    const approved = await service.approve({
      requestId: request.id,
      actorId: 'demo-matthieu',
      actorRole: 'CHILD',
      actorFamilyId: 'demo-family',
    });
    expect(approved.status).toBe('APPROVED');

    const damienAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    const matthieuAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-matthieu' } });
    expect(damienAfter.balanceCents).toBe(damienBefore.balanceCents + 1000);
    expect(matthieuAfter.balanceCents).toBe(matthieuBefore.balanceCents - 1000);
  });

  it('propagates insufficient funds when approving a withdrawal beyond the balance', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'WITHDRAWAL_REQUEST',
      amountCents: 999_999_999,
    });

    await expect(
      service.approve({
        requestId: request.id,
        actorId: 'demo-papa',
        actorRole: 'PARENT',
        actorFamilyId: 'demo-family',
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it('only the requester can cancel their own pending request', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 300,
    });

    await expect(service.cancel({ requestId: request.id, actorId: 'demo-matthieu' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    const cancelled = await service.cancel({ requestId: request.id, actorId: 'demo-elodie' });
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('refuses to respond to a request that is no longer pending', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 300,
    });
    await service.cancel({ requestId: request.id, actorId: 'demo-elodie' });

    await expect(
      service.approve({
        requestId: request.id,
        actorId: 'demo-papa',
        actorRole: 'PARENT',
        actorFamilyId: 'demo-family',
      }),
    ).rejects.toBeInstanceOf(InvalidRequestStateError);
  });

  it('lists a pending request for both the requester and the targeted sibling', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-damien',
      familyId: 'demo-family',
      type: 'TRANSFER_REQUEST',
      amountCents: 200,
      targetUserId: 'demo-elodie',
    });

    const damienList = await service.listMine('demo-damien');
    const elodieList = await service.listMine('demo-elodie');

    expect(damienList.some((r) => r.id === request.id)).toBe(true);
    expect(elodieList.some((r) => r.id === request.id)).toBe(true);
  });

  it('notifies both parents (not the requester) when a deposit request is created', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 400,
    });

    const papaNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-papa', relatedMoneyRequestId: request.id },
    });
    const mamanNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-maman', relatedMoneyRequestId: request.id },
    });
    const elodieNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-elodie', relatedMoneyRequestId: request.id },
    });

    expect(papaNotifs).toHaveLength(1);
    expect(mamanNotifs).toHaveLength(1);
    expect(elodieNotifs).toHaveLength(0);
  });

  it('notifies the requester (and only them) when their request is approved', async () => {
    const request = await service.createRequest({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      type: 'DEPOSIT_REQUEST',
      amountCents: 250,
    });
    await service.approve({
      requestId: request.id,
      actorId: 'demo-papa',
      actorRole: 'PARENT',
      actorFamilyId: 'demo-family',
    });

    const elodieNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-elodie', relatedMoneyRequestId: request.id, type: 'MONEY_REQUEST_APPROVED' },
    });
    const papaApprovalNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-papa', relatedMoneyRequestId: request.id, type: 'MONEY_REQUEST_APPROVED' },
    });

    expect(elodieNotifs).toHaveLength(1);
    expect(papaApprovalNotifs).toHaveLength(0);
  });
});
