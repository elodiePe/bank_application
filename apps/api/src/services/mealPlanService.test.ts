import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createMealPlanService, type MealPlanService } from './mealPlanService.js';
import { ValidationError } from '../utils/errors.js';

// Long enough to guarantee several occurrences of every weekday regardless of which real
// calendar day the suite happens to run on.
const LOOKAHEAD_DAYS = 60;

describe('mealPlanService (seeded demo family)', () => {
  let db: TestDb;
  let service: MealPlanService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createMealPlanService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('a FIXED day always resolves to the same person, on every occurrence of that weekday', async () => {
    await service.setDay({ familyId: 'demo-family', weekday: 0, mode: 'FIXED', fixedUserIds: ['demo-papa'] });

    const upcoming = await service.listUpcoming('demo-family', LOOKAHEAD_DAYS);
    const mondays = upcoming.filter((d) => d.weekday === 0);
    expect(mondays.length).toBeGreaterThanOrEqual(4);
    for (const day of mondays) {
      expect(day.assignedUserIds).toEqual(['demo-papa']);
    }
  });

  it('a FIXED day can be shared by several people at once', async () => {
    await service.setDay({ familyId: 'demo-family', weekday: 1, mode: 'FIXED', fixedUserIds: ['demo-papa', 'demo-maman'] });

    const upcoming = await service.listUpcoming('demo-family', 7);
    const tuesday = upcoming.find((d) => d.weekday === 1)!;
    expect(tuesday.assignedUserIds).toEqual(['demo-papa', 'demo-maman']);
    expect(tuesday.assignedFirstNames).toEqual(['Papa', 'Maman']);
  });

  it('a ROTATING day advances exactly one step per calendar week and cycles back around', async () => {
    await service.setRotationOrder({ familyId: 'demo-family', orderedGroups: [['demo-maman'], ['demo-papa']] });
    await service.setDay({ familyId: 'demo-family', weekday: 2, mode: 'ROTATING' });

    const upcoming = await service.listUpcoming('demo-family', LOOKAHEAD_DAYS);
    const wednesdays = upcoming.filter((d) => d.weekday === 2);
    expect(wednesdays.length).toBeGreaterThanOrEqual(4);

    for (const day of wednesdays) {
      expect(day.assignedUserIds).toHaveLength(1);
      expect(['demo-maman', 'demo-papa']).toContain(day.assignedUserIds[0]);
    }
    // Consecutive weeks alternate...
    for (let i = 1; i < wednesdays.length; i++) {
      expect(wednesdays[i]!.assignedUserIds[0]).not.toBe(wednesdays[i - 1]!.assignedUserIds[0]);
    }
    // ...and land on the same person again two weeks apart.
    for (let i = 2; i < wednesdays.length; i++) {
      expect(wednesdays[i]!.assignedUserIds[0]).toBe(wednesdays[i - 2]!.assignedUserIds[0]);
    }
  });

  it('a ROTATING turn can be a group shared by several people at once', async () => {
    await service.setRotationOrder({
      familyId: 'demo-family',
      orderedGroups: [['demo-maman'], ['demo-papa', 'demo-elodie']],
    });
    await service.setDay({ familyId: 'demo-family', weekday: 2, mode: 'ROTATING' });

    const upcoming = await service.listUpcoming('demo-family', 14);
    const wednesdays = upcoming.filter((d) => d.weekday === 2);
    expect(wednesdays.length).toBeGreaterThanOrEqual(2);
    // Every other Wednesday lands on the two-person group.
    const groupTurn = wednesdays.find((d) => d.assignedUserIds.length === 2);
    expect(groupTurn?.assignedUserIds).toEqual(['demo-papa', 'demo-elodie']);
  });

  it('two different ROTATING weekdays share the same order but land on different people', async () => {
    await service.setRotationOrder({ familyId: 'demo-family', orderedGroups: [['demo-maman'], ['demo-papa']] });
    await service.setDay({ familyId: 'demo-family', weekday: 2, mode: 'ROTATING' }); // Wednesday
    await service.setDay({ familyId: 'demo-family', weekday: 3, mode: 'ROTATING' }); // Thursday

    const upcoming = await service.listUpcoming('demo-family', 7);
    const wednesday = upcoming.find((d) => d.weekday === 2)!;
    const thursday = upcoming.find((d) => d.weekday === 3)!;
    expect(wednesday.assignedUserIds).not.toEqual(thursday.assignedUserIds);
  });

  it('non-contiguous ROTATING weekdays never repeat the same person on consecutive turns', async () => {
    // Regression: offsetting the rotation index by the raw weekday number (instead of each
    // rotating weekday's rank among the *other* rotating weekdays) collided whenever two
    // rotating weekdays shared a residue mod the order length — e.g. Monday (0) and Friday (4)
    // both land on index 0 mod a 4-person order, so the same person cooked both, and the very
    // next rotating turn (the following Monday) repeated whoever had just cooked Friday.
    const order = ['demo-papa', 'demo-maman', 'demo-elodie', 'demo-matthieu'];
    await service.setRotationOrder({ familyId: 'demo-family', orderedGroups: order.map((id) => [id]) });
    await service.setDay({ familyId: 'demo-family', weekday: 0, mode: 'ROTATING' }); // Monday
    await service.setDay({ familyId: 'demo-family', weekday: 4, mode: 'ROTATING' }); // Friday

    const upcoming = await service.listUpcoming('demo-family', LOOKAHEAD_DAYS);
    const turns = upcoming
      .filter((d) => d.weekday === 0 || d.weekday === 4)
      .sort((a, b) => a.date.localeCompare(b.date));
    expect(turns.length).toBeGreaterThanOrEqual(8);

    for (const turn of turns) {
      expect(order).toContain(turn.assignedUserIds[0]);
    }
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i]!.assignedUserIds[0]).not.toBe(turns[i - 1]!.assignedUserIds[0]);
    }
    // Every 4th turn (the order's length) lands back on the same person.
    for (let i = 4; i < turns.length; i++) {
      expect(turns[i]!.assignedUserIds[0]).toBe(turns[i - 4]!.assignedUserIds[0]);
    }
  });

  it('an unconfigured weekday has no assignee', async () => {
    const upcoming = await service.listUpcoming('demo-family', LOOKAHEAD_DAYS);
    const saturdays = upcoming.filter((d) => d.weekday === 5);
    expect(saturdays.length).toBeGreaterThan(0);
    for (const day of saturdays) {
      expect(day.assignedUserIds).toEqual([]);
      expect(day.assignedFirstNames).toEqual([]);
    }
  });

  it('refuses to assign someone outside the family', async () => {
    await expect(
      service.setDay({ familyId: 'demo-family', weekday: 1, mode: 'FIXED', fixedUserIds: ['not-a-real-user'] }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      service.setRotationOrder({ familyId: 'demo-family', orderedGroups: [['demo-papa'], ['not-a-real-user']] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('list() reports each configured weekday, and getRotationOrder() resolves first names', async () => {
    await service.setDay({ familyId: 'demo-family', weekday: 0, mode: 'FIXED', fixedUserIds: ['demo-papa'] });
    await service.setRotationOrder({ familyId: 'demo-family', orderedGroups: [['demo-maman'], ['demo-papa']] });
    await service.setDay({ familyId: 'demo-family', weekday: 2, mode: 'ROTATING' });

    const config = await service.list('demo-family');
    expect(config.find((c) => c.weekday === 0)).toMatchObject({
      mode: 'FIXED',
      fixedUserIds: ['demo-papa'],
      fixedFirstNames: ['Papa'],
    });
    expect(config.find((c) => c.weekday === 2)).toMatchObject({ mode: 'ROTATING', fixedUserIds: [] });

    const order = await service.getRotationOrder('demo-family');
    expect(order).toEqual({
      orderedGroups: [['demo-maman'], ['demo-papa']],
      orderedGroupFirstNames: [['Maman'], ['Papa']],
    });
  });

  describe('occurrence status (done / postponed)', () => {
    it('marking a date done never changes who is assigned', async () => {
      await service.setDay({ familyId: 'demo-family', weekday: 0, mode: 'FIXED', fixedUserIds: ['demo-papa'] });
      const upcoming = await service.listUpcoming('demo-family', 7);
      const monday = upcoming.find((d) => d.weekday === 0)!;
      expect(monday.done).toBe(false);

      await service.setOccurrenceStatus({ familyId: 'demo-family', date: monday.date, done: true });

      const after = await service.listUpcoming('demo-family', 7);
      const mondayAfter = after.find((d) => d.weekday === 0)!;
      expect(mondayAfter.done).toBe(true);
      expect(mondayAfter.assignedUserIds).toEqual(['demo-papa']);
    });

    it('postponing a date to another one carries the original assignee over, and flags the original date', async () => {
      await service.setDay({ familyId: 'demo-family', weekday: 0, mode: 'FIXED', fixedUserIds: ['demo-papa'] });
      await service.setDay({ familyId: 'demo-family', weekday: 1, mode: 'FIXED', fixedUserIds: ['demo-maman'] });

      const upcoming = await service.listUpcoming('demo-family', 7);
      const monday = upcoming.find((d) => d.weekday === 0)!;
      const tuesday = upcoming.find((d) => d.weekday === 1)!;

      await service.setOccurrenceStatus({ familyId: 'demo-family', date: monday.date, postponeToDate: tuesday.date });

      const after = await service.listUpcoming('demo-family', 7);
      const mondayAfter = after.find((d) => d.weekday === 0)!;
      const tuesdayAfter = after.find((d) => d.weekday === 1)!;

      expect(mondayAfter.postponedTo).toBe(tuesday.date);
      expect(tuesdayAfter.assignedUserIds.sort()).toEqual(['demo-maman', 'demo-papa'].sort());
    });

    it('done and postponed are both reversible: an explicit null clears the postponement, done:false clears done', async () => {
      await service.setDay({ familyId: 'demo-family', weekday: 0, mode: 'FIXED', fixedUserIds: ['demo-papa'] });
      await service.setDay({ familyId: 'demo-family', weekday: 1, mode: 'FIXED', fixedUserIds: ['demo-maman'] });

      const upcoming = await service.listUpcoming('demo-family', 7);
      const monday = upcoming.find((d) => d.weekday === 0)!;
      const tuesday = upcoming.find((d) => d.weekday === 1)!;

      await service.setOccurrenceStatus({ familyId: 'demo-family', date: monday.date, done: true });
      await service.setOccurrenceStatus({ familyId: 'demo-family', date: monday.date, done: false });
      const afterUndoneDone = await service.listUpcoming('demo-family', 7);
      expect(afterUndoneDone.find((d) => d.weekday === 0)!.done).toBe(false);

      await service.setOccurrenceStatus({ familyId: 'demo-family', date: monday.date, postponeToDate: tuesday.date });
      await service.setOccurrenceStatus({ familyId: 'demo-family', date: monday.date, postponeToDate: null });
      const afterUndonePostpone = await service.listUpcoming('demo-family', 7);
      expect(afterUndonePostpone.find((d) => d.weekday === 0)!.postponedTo).toBeNull();
      expect(afterUndonePostpone.find((d) => d.weekday === 1)!.assignedUserIds).toEqual(['demo-maman']);
    });
  });

  describe('cook notifications', () => {
    // Monday is FIXED to demo-papa throughout this suite (set in earlier tests above). Two
    // distinct Mondays are used across these tests so each one's dedupe log starts empty.
    const MONDAY = new Date(Date.UTC(2024, 0, 8));
    const OTHER_MONDAY = new Date(Date.UTC(2024, 0, 15));
    const OTHER_SUNDAY_EVENING = new Date(Date.UTC(2024, 0, 14, 19)); // the evening before OTHER_MONDAY
    const OTHER_SUNDAY_AFTERNOON = new Date(Date.UTC(2024, 0, 14, 10)); // too early for the advance notice

    it('notifies the same-day cook once, then dedupes on a second run for the same date', async () => {
      const before = await db.prisma.notification.count({ where: { userId: 'demo-papa', type: 'MEAL_PLAN_TURN' } });

      const notified = await service.processDailyCookNotifications(MONDAY);
      expect(notified).toBe(1);

      const afterFirst = await db.prisma.notification.count({ where: { userId: 'demo-papa', type: 'MEAL_PLAN_TURN' } });
      expect(afterFirst).toBe(before + 1);

      const notifiedAgain = await service.processDailyCookNotifications(MONDAY);
      expect(notifiedAgain).toBe(0);

      const afterSecond = await db.prisma.notification.count({ where: { userId: 'demo-papa', type: 'MEAL_PLAN_TURN' } });
      expect(afterSecond).toBe(afterFirst);
    });

    it('does not send the advance notice before the evening window opens', async () => {
      const notified = await service.processNextDayCookNotifications(OTHER_SUNDAY_AFTERNOON);
      expect(notified).toBe(0);
    });

    it('sends an advance notice for tomorrow once the evening window opens, deduped separately from the same-day notice', async () => {
      const before = await db.prisma.notification.count({ where: { userId: 'demo-papa', type: 'MEAL_PLAN_TURN' } });

      const notified = await service.processNextDayCookNotifications(OTHER_SUNDAY_EVENING);
      expect(notified).toBe(1);

      const afterFirst = await db.prisma.notification.count({ where: { userId: 'demo-papa', type: 'MEAL_PLAN_TURN' } });
      expect(afterFirst).toBe(before + 1);

      // Running again the same evening doesn't repeat it...
      const notifiedAgain = await service.processNextDayCookNotifications(OTHER_SUNDAY_EVENING);
      expect(notifiedAgain).toBe(0);

      // ...but once that Monday actually arrives, the same-day notice still fires — the two
      // kinds are deduped independently even though they target the same date.
      const notifiedSameDay = await service.processDailyCookNotifications(OTHER_MONDAY);
      expect(notifiedSameDay).toBe(1);
    });
  });
});
