import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createNotificationService, type NotificationService } from './notificationService.js';

describe('notificationService (seeded demo family)', () => {
  let db: TestDb;
  let service: NotificationService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createNotificationService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('notifies every parent (not the requester) when a deposit/withdrawal request is created', async () => {
    await service.notifyParentsOfRequest({
      familyId: 'demo-family',
      requesterFirstName: 'Elodie',
      amountCents: 2000,
      moneyRequestId: 'req-1',
      isWithdrawal: false,
    });

    const papaNotifs = await service.listMine('demo-papa');
    const mamanNotifs = await service.listMine('demo-maman');
    const elodieNotifs = await service.listMine('demo-elodie');

    expect(papaNotifs).toHaveLength(1);
    expect(papaNotifs[0]).toMatchObject({ type: 'MONEY_REQUEST_CREATED', isRead: false });
    expect(mamanNotifs).toHaveLength(1);
    expect(elodieNotifs).toHaveLength(0); // the requester doesn't notify themselves
  });

  it('notifies only the targeted sibling for a transfer request', async () => {
    await service.notifySiblingOfRequest({
      targetUserId: 'demo-matthieu',
      requesterFirstName: 'Damien',
      amountCents: 500,
      moneyRequestId: 'req-2',
    });

    const matthieuNotifs = await service.listMine('demo-matthieu');
    const damienNotifs = await service.listMine('demo-damien');

    expect(matthieuNotifs.some((n) => n.body.includes('Damien'))).toBe(true);
    expect(damienNotifs).toHaveLength(0);
  });

  it('notifies the requester when their request is approved or rejected', async () => {
    await service.notifyRequestApproved({
      requesterId: 'demo-elodie',
      amountCents: 1000,
      approvedByFirstName: 'Papa',
      moneyRequestId: 'req-3',
    });
    await service.notifyRequestRejected({
      requesterId: 'demo-elodie',
      amountCents: 700,
      rejectedByFirstName: 'Maman',
      moneyRequestId: 'req-4',
    });

    const elodieNotifs = await service.listMine('demo-elodie');
    expect(elodieNotifs.map((n) => n.type).sort()).toEqual(
      ['MONEY_REQUEST_APPROVED', 'MONEY_REQUEST_REJECTED'].sort(),
    );
  });

  it('notifies both sides of a transfer with distinct messages', async () => {
    await service.notifyTransfer({
      fromUserId: 'demo-matthieu',
      toUserId: 'demo-damien',
      fromFirstName: 'Matthieu',
      toFirstName: 'Damien',
      amountCents: 300,
      transactionId: 'tx-1',
    });

    const matthieuNotifs = await service.listMine('demo-matthieu');
    const damienNotifs = await service.listMine('demo-damien');

    expect(matthieuNotifs.some((n) => n.title === 'Virement envoyé')).toBe(true);
    expect(damienNotifs.some((n) => n.title === 'Virement reçu')).toBe(true);
  });

  it('counts unread and marks notifications as read, scoped to the right user', async () => {
    const before = await service.countUnread('demo-elodie');
    expect(before).toBeGreaterThan(0);

    const [first] = await service.listMine('demo-elodie');
    // A different user can't mark someone else's notification as read.
    await service.markAsRead(first!.id, 'demo-matthieu');
    const stillUnread = await service.countUnread('demo-elodie');
    expect(stillUnread).toBe(before);

    await service.markAsRead(first!.id, 'demo-elodie');
    const afterOne = await service.countUnread('demo-elodie');
    expect(afterOne).toBe(before - 1);

    await service.markAllAsRead('demo-elodie');
    expect(await service.countUnread('demo-elodie')).toBe(0);
  });
});
