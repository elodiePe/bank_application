import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const withFixedUser = { fixedUser: true } satisfies Prisma.MealPlanSlotInclude;

export function createMealPlanRepository(prisma: Db) {
  return {
    listForFamily(familyId: string) {
      return prisma.mealPlanSlot.findMany({
        where: { familyId },
        include: withFixedUser,
        orderBy: { weekday: 'asc' },
      });
    },

    upsertDay(familyId: string, weekday: number, data: { mode: 'FIXED' | 'ROTATING'; fixedUserId: string | null }) {
      return prisma.mealPlanSlot.upsert({
        where: { familyId_weekday: { familyId, weekday } },
        create: { familyId, weekday, ...data },
        update: data,
        include: withFixedUser,
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

    setRotationOrder(familyId: string, orderedUserIds: string[]) {
      return prisma.mealPlanRotationOrder.upsert({
        where: { familyId },
        create: { familyId, orderedUserIds },
        update: { orderedUserIds },
      });
    },

    findNotificationLog(familyId: string, date: Date, kind: 'TODAY' | 'ADVANCE' = 'TODAY') {
      return prisma.mealCookNotificationLog.findUnique({ where: { familyId_date_kind: { familyId, date, kind } } });
    },

    createNotificationLog(familyId: string, date: Date, userId: string, kind: 'TODAY' | 'ADVANCE' = 'TODAY') {
      return prisma.mealCookNotificationLog.create({ data: { familyId, date, userId, kind } });
    },
  };
}

export type MealPlanRepository = ReturnType<typeof createMealPlanRepository>;
