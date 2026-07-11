import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { createMoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createDashboardService, type DashboardService } from './dashboardService.js';

describe('dashboardService (seeded demo family)', () => {
  let db: TestDb;
  let dashboardService: DashboardService;
  let elodieAccountId: string;
  let matthieuAccountId: string;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);

    dashboardService = createDashboardService({
      familyRepository: createFamilyRepository(db.prisma),
      moneyRequestRepository: createMoneyRequestRepository(db.prisma),
      transactionRepository: createTransactionRepository(db.prisma),
    });

    const elodie = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-elodie' },
      include: { childAccount: true },
    });
    const matthieu = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-matthieu' },
      include: { childAccount: true },
    });
    elodieAccountId = elodie.childAccount!.id;
    matthieuAccountId = matthieu.childAccount!.id;

    await db.prisma.childAccount.update({
      where: { id: elodieAccountId },
      data: { balanceCents: 5000 },
    });
    await db.prisma.childAccount.update({
      where: { id: matthieuAccountId },
      data: { balanceCents: 3000 },
    });

    await db.prisma.transaction.create({
      data: {
        accountId: elodieAccountId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amountCents: 5000,
        balanceBeforeCents: 0,
        balanceAfterCents: 5000,
        comment: 'Argent de poche',
        occurredAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await db.prisma.transaction.create({
      data: {
        accountId: matthieuAccountId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amountCents: 3000,
        balanceBeforeCents: 0,
        balanceAfterCents: 3000,
        comment: 'Anniversaire',
        occurredAt: new Date('2024-02-01T00:00:00Z'),
      },
    });

    await db.prisma.moneyRequest.create({
      data: {
        requesterId: 'demo-elodie',
        type: 'WITHDRAWAL_REQUEST',
        status: 'PENDING',
        amountCents: 1000,
      },
    });
  });

  afterAll(() => db.teardown());

  it('sums balances across all children for the total', async () => {
    const overview = await dashboardService.getParentOverview('demo-family');
    // Elodie 5000 + Matthieu 3000 + Damien 0 (untouched)
    expect(overview.totalBalanceCents).toBe(8000);
    expect(overview.children).toHaveLength(3);
  });

  it('includes each child with their own balance', async () => {
    const overview = await dashboardService.getParentOverview('demo-family');
    const elodie = overview.children.find((c) => c.firstName === 'Elodie');
    expect(elodie?.balanceCents).toBe(5000);
  });

  it('counts only pending money requests', async () => {
    const overview = await dashboardService.getParentOverview('demo-family');
    expect(overview.pendingRequestsCount).toBe(1);
  });

  it('lists recent transactions across the family, most recent first', async () => {
    const recent = await dashboardService.getRecentFamilyTransactions('demo-family');
    expect(recent).toHaveLength(2);
    expect(recent[0]).toMatchObject({ childFirstName: 'Matthieu', comment: 'Anniversaire' });
    expect(recent[1]).toMatchObject({ childFirstName: 'Elodie', comment: 'Argent de poche' });
  });

  it('respects the limit parameter', async () => {
    const recent = await dashboardService.getRecentFamilyTransactions('demo-family', 1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.childFirstName).toBe('Matthieu');
  });
});
