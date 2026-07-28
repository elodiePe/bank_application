import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createChoreService, type ChoreService } from './choreService.js';
import { ConflictError, ForbiddenError, InvalidRequestStateError, ValidationError } from '../utils/errors.js';

describe('choreService (seeded demo family)', () => {
  let db: TestDb;
  let service: ChoreService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createChoreService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('creates a chore for a specific child, refusing an invalid target', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Mettre la table',
      rewardType: 'MONEY',
      rewardCents: 50,
      recurrence: 'DAILY',
    });
    expect(chore).toMatchObject({
      childUserId: 'demo-damien',
      childFirstName: 'Damien',
      title: 'Mettre la table',
      active: true,
      currentPeriodStatus: null,
    });

    // A parent isn't a valid target — only children get chores.
    await expect(
      service.createChore({
        familyId: 'demo-family',
        childUserId: 'demo-papa',
        title: 'Invalide',
        rewardType: 'MONEY',
        rewardCents: 50,
        recurrence: 'ONCE',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('a child completes their own chore, but not one assigned to a sibling', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Sortir les poubelles',
      rewardType: 'MONEY',
      rewardCents: 100,
      recurrence: 'DAILY',
    });

    await expect(
      service.completeChore({ familyId: 'demo-family', childUserId: 'demo-elodie', choreId: chore.id }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });
    expect(completion).toMatchObject({ status: 'PENDING', rewardCents: 100, childUserId: 'demo-damien' });
  });

  it('refuses a second submission for the same period while one is still pending, but allows a retry after rejection', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Faire la vaisselle',
      rewardType: 'MONEY',
      rewardCents: 80,
      recurrence: 'DAILY',
    });

    const first = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });

    await expect(
      service.completeChore({ familyId: 'demo-family', childUserId: 'demo-damien', choreId: chore.id }),
    ).rejects.toBeInstanceOf(ConflictError);

    await service.rejectCompletion({ familyId: 'demo-family', actorId: 'demo-papa', completionId: first.id });

    // Now that the pending one was rejected, a fresh attempt for the same day is allowed.
    const retry = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });
    expect(retry.status).toBe('PENDING');
  });

  it('approving a completion credits the child and marks a ONCE chore inactive', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Laver la voiture',
      rewardType: 'MONEY',
      rewardCents: 200,
      recurrence: 'ONCE',
    });
    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });

    const before = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    const approved = await service.approveCompletion({
      familyId: 'demo-family',
      actorId: 'demo-maman',
      completionId: completion.id,
    });
    expect(approved).toMatchObject({ status: 'APPROVED', respondedByFirstName: 'Maman' });

    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    expect(after.balanceCents).toBe(before.balanceCents + 200);

    const familyChores = await service.listFamilyChores('demo-family');
    expect(familyChores.find((c) => c.id === chore.id)?.active).toBe(false);

    // Already responded to — can't be approved or rejected again.
    await expect(
      service.approveCompletion({ familyId: 'demo-family', actorId: 'demo-maman', completionId: completion.id }),
    ).rejects.toBeInstanceOf(InvalidRequestStateError);
  });

  it('rejecting a completion never moves money', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Arroser les plantes',
      rewardType: 'MONEY',
      rewardCents: 60,
      recurrence: 'WEEKLY',
    });
    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });

    const before = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    const rejected = await service.rejectCompletion({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      completionId: completion.id,
    });
    expect(rejected.status).toBe('REJECTED');

    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    expect(after.balanceCents).toBe(before.balanceCents);
  });

  it('notifies parents when a chore is completed, and the child when it is approved/rejected', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Nourrir le chat',
      rewardType: 'MONEY',
      rewardCents: 40,
      recurrence: 'DAILY',
    });
    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });

    const papaNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-papa', type: 'CHORE_COMPLETED', relatedChoreCompletionId: completion.id },
    });
    expect(papaNotifs).toHaveLength(1);

    await service.approveCompletion({ familyId: 'demo-family', actorId: 'demo-papa', completionId: completion.id });

    const damienNotifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-damien', type: 'CHORE_APPROVED', relatedChoreCompletionId: completion.id },
    });
    expect(damienNotifs).toHaveLength(1);
  });

  it('approving a points-rewarded completion credits pointsBalance without creating a Transaction', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Lire un livre',
      rewardType: 'POINTS',
      rewardPoints: 25,
      recurrence: 'DAILY',
    });
    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });
    expect(completion).toMatchObject({ rewardType: 'POINTS', rewardPoints: 25, rewardCents: null });

    const before = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    const transactionsBefore = await db.prisma.transaction.count({ where: { accountId: before.id } });

    const approved = await service.approveCompletion({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      completionId: completion.id,
    });
    expect(approved.status).toBe('APPROVED');

    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-damien' } });
    expect(after.pointsBalance).toBe(before.pointsBalance + 25);
    expect(after.balanceCents).toBe(before.balanceCents); // money untouched

    const transactionsAfter = await db.prisma.transaction.count({ where: { accountId: after.id } });
    expect(transactionsAfter).toBe(transactionsBefore); // no ledger entry for a points reward
  });

  it('lists pending completions for the family', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Passer l\'aspirateur',
      rewardType: 'MONEY',
      rewardCents: 150,
      recurrence: 'ONCE',
    });
    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });

    const pending = await service.listPendingCompletions('demo-family');
    expect(pending.some((c) => c.id === completion.id)).toBe(true);
  });

  it('reminds the child once a DAILY chore has sat undone past the threshold, and never twice for the same day', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Ranger sa chambre',
      rewardType: 'MONEY',
      rewardCents: 30,
      recurrence: 'DAILY',
    });

    const startOfToday = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    );
    const reminderTime = new Date(startOfToday.getTime() + 13 * 60 * 60 * 1000); // 13h in — past the 12h DAILY threshold

    const first = await service.processReminders(reminderTime);
    expect(first.choreReminders).toBeGreaterThanOrEqual(1);

    const reminders = await db.prisma.notification.findMany({
      where: { userId: 'demo-damien', type: 'CHORE_REMINDER', relatedChoreId: chore.id },
    });
    expect(reminders).toHaveLength(1);

    // Running it again the same "day" must not send a second one.
    const second = await service.processReminders(new Date(reminderTime.getTime() + 60 * 60 * 1000));
    const remindersAfter = await db.prisma.notification.findMany({
      where: { userId: 'demo-damien', type: 'CHORE_REMINDER', relatedChoreId: chore.id },
    });
    expect(remindersAfter).toHaveLength(1);
    expect(second.choreReminders).toBe(0);
  });

  it('never reminds about a chore already completed for the current period', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Faire ses devoirs (rappel)',
      rewardType: 'MONEY',
      rewardCents: 30,
      recurrence: 'DAILY',
    });
    await service.completeChore({ familyId: 'demo-family', childUserId: 'demo-damien', choreId: chore.id });

    const startOfToday = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
    );
    const reminderTime = new Date(startOfToday.getTime() + 13 * 60 * 60 * 1000);
    await service.processReminders(reminderTime);

    const reminders = await db.prisma.notification.findMany({
      where: { userId: 'demo-damien', type: 'CHORE_REMINDER', relatedChoreId: chore.id },
    });
    expect(reminders).toHaveLength(0);
  });

  it('reminds the parents once a completion has sat pending past the threshold, and never twice for the same completion', async () => {
    const chore = await service.createChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      title: 'Sortir le recyclage',
      rewardType: 'MONEY',
      rewardCents: 30,
      recurrence: 'DAILY',
    });
    const completion = await service.completeChore({
      familyId: 'demo-family',
      childUserId: 'demo-damien',
      choreId: chore.id,
    });

    const wellPast = new Date(Date.now() + 25 * 60 * 60 * 1000); // 25h later — past the 24h threshold
    const first = await service.processReminders(wellPast);
    expect(first.approvalReminders).toBeGreaterThanOrEqual(1);

    const reminders = await db.prisma.notification.findMany({
      where: { type: 'CHORE_REMINDER', relatedChoreCompletionId: completion.id },
    });
    expect(reminders.length).toBeGreaterThanOrEqual(1);

    const second = await service.processReminders(new Date(wellPast.getTime() + 60 * 60 * 1000));
    const remindersAfter = await db.prisma.notification.findMany({
      where: { type: 'CHORE_REMINDER', relatedChoreCompletionId: completion.id },
    });
    expect(remindersAfter.length).toBe(reminders.length);
    expect(second.approvalReminders).toBe(0);
  });
});
