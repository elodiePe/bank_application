import type { Db } from '../database/types.js';

export function createMealPlanRepository(prisma: Db) {
  return {
    listForFamily(familyId: string) {
      return prisma.mealPlanSlot.findMany({
        where: { familyId },
        orderBy: { weekday: 'asc' },
      });
    },

    upsertDay(familyId: string, weekday: number, data: { mode: 'FIXED' | 'ROTATING'; fixedUserIds: string[] }) {
      return prisma.mealPlanSlot.upsert({
        where: { familyId_weekday: { familyId, weekday } },
        create: { familyId, weekday, ...data },
        update: data,
      });
    },

    /** Every family that has *any* config for this weekday — scanned daily to find today's
     * cook per family. */
    listFamilyIdsConfiguredForWeekday(weekday: number) {
      return prisma.mealPlanSlot.findMany({
        where: { weekday },
        distinct: ['familyId'],
        select: { familyId: true },
      });
    },

    findRotationOrder(familyId: string) {
      return prisma.mealPlanRotationOrder.findUnique({ where: { familyId } });
    },

    setRotationOrder(familyId: string, orderedGroups: string[][]) {
      return prisma.mealPlanRotationOrder.upsert({
        where: { familyId },
        create: { familyId, orderedGroups },
        update: { orderedGroups },
      });
    },

    findNotificationLog(familyId: string, date: Date, kind: string = 'TODAY') {
      return prisma.mealCookNotificationLog.findUnique({ where: { familyId_date_kind: { familyId, date, kind } } });
    },

    createNotificationLog(familyId: string, date: Date, userId: string, kind: string = 'TODAY') {
      return prisma.mealCookNotificationLog.create({ data: { familyId, date, userId, kind } });
    },

    findChoreConfig(familyId: string) {
      return prisma.mealPlanChoreConfig.findUnique({ where: { familyId } });
    },

    setChoreConfig(
      familyId: string,
      data: {
        enabled: boolean;
        requiresApproval: boolean;
        rewardType: 'MONEY' | 'POINTS' | 'NONE';
        rewardCents: number | null;
        rewardPoints: number | null;
      },
    ) {
      return prisma.mealPlanChoreConfig.upsert({
        where: { familyId },
        create: { familyId, ...data },
        update: data,
      });
    },

    /** Every family with chore-generation enabled — scanned daily alongside the cook
     * notification pass. */
    listFamilyIdsWithChoreGenEnabled() {
      return prisma.mealPlanChoreConfig.findMany({ where: { enabled: true }, select: { familyId: true } });
    },

    /** Every done/postponed overlay relevant to a [rangeStart, rangeEnd) window — either the
     * status's own date falls in the window, or it was postponed *into* the window from
     * outside it (e.g. postponed yesterday to today). */
    listOccurrenceStatusesInRange(familyId: string, rangeStart: Date, rangeEnd: Date) {
      return prisma.mealPlanOccurrenceStatus.findMany({
        where: {
          familyId,
          OR: [
            { date: { gte: rangeStart, lt: rangeEnd } },
            { postponedToDate: { gte: rangeStart, lt: rangeEnd } },
          ],
        },
      });
    },

    setOccurrenceStatus(
      familyId: string,
      date: Date,
      data: { done?: boolean; postponedToDate?: Date | null },
    ) {
      return prisma.mealPlanOccurrenceStatus.upsert({
        where: { familyId_date: { familyId, date } },
        create: { familyId, date, ...data },
        update: data,
      });
    },
  };
}

export type MealPlanRepository = ReturnType<typeof createMealPlanRepository>;
