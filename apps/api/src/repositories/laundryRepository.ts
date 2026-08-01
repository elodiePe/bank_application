import type { Db } from '../database/types.js';

export function createLaundryRepository(prisma: Db) {
  return {
    listForFamily(familyId: string) {
      return prisma.laundryType.findMany({
        where: { familyId },
        orderBy: { order: 'asc' },
      });
    },

    findById(id: string) {
      return prisma.laundryType.findUnique({ where: { id } });
    },

    async create(data: {
      familyId: string;
      name: string;
      mode: 'FIXED' | 'ROTATING';
      fixedUserIds: string[];
      rotationGroups: string[][];
      scheduleType: 'ONCE' | 'WEEKLY' | 'MULTIPLE';
      weekdays: number[];
      onceDate: Date | null;
      generatesChore: boolean;
      choreRequiresApproval: boolean;
      choreRewardType: 'MONEY' | 'POINTS' | 'NONE' | null;
      choreRewardCents: number | null;
      choreRewardPoints: number | null;
    }) {
      const maxOrder = await prisma.laundryType.aggregate({
        where: { familyId: data.familyId },
        _max: { order: true },
      });
      return prisma.laundryType.create({
        data: { ...data, order: (maxOrder._max.order ?? -1) + 1 },
      });
    },

    update(
      id: string,
      data: {
        name: string;
        mode: 'FIXED' | 'ROTATING';
        fixedUserIds: string[];
        rotationGroups: string[][];
        scheduleType: 'ONCE' | 'WEEKLY' | 'MULTIPLE';
        weekdays: number[];
        onceDate: Date | null;
        generatesChore: boolean;
        choreRequiresApproval: boolean;
        choreRewardType: 'MONEY' | 'POINTS' | 'NONE' | null;
        choreRewardCents: number | null;
        choreRewardPoints: number | null;
      },
    ) {
      return prisma.laundryType.update({
        where: { id },
        data,
      });
    },

    delete(id: string) {
      return prisma.laundryType.delete({ where: { id } });
    },

    async reorder(familyId: string, orderedIds: string[]) {
      await Promise.all(
        orderedIds.map((id, index) => prisma.laundryType.update({ where: { id, familyId }, data: { order: index } })),
      );
    },

    /** Every type (across every family) due on `date` — WEEKLY/MULTIPLE types whose
     * `weekdays` includes this date's weekday, or ONCE types whose `onceDate` matches. Scanned
     * daily to find who's due, the same way MealPlanSlot's weekday is scanned for cooks. */
    listDueForDate(date: Date, weekday: number) {
      return prisma.laundryType.findMany({
        where: {
          OR: [
            { scheduleType: { in: ['WEEKLY', 'MULTIPLE'] }, weekdays: { has: weekday } },
            { scheduleType: 'ONCE', onceDate: date },
          ],
        },
      });
    },

    findNotificationLog(laundryTypeId: string, date: Date, kind: string = 'TODAY') {
      return prisma.laundryNotificationLog.findUnique({
        where: { laundryTypeId_date_kind: { laundryTypeId, date, kind } },
      });
    },

    createNotificationLog(familyId: string, laundryTypeId: string, date: Date, userId: string, kind: string = 'TODAY') {
      return prisma.laundryNotificationLog.create({ data: { familyId, laundryTypeId, date, userId, kind } });
    },

    /** Same overlay concept as meal plan's occurrence status, scoped per laundry type. */
    listOccurrenceStatusesInRange(familyId: string, rangeStart: Date, rangeEnd: Date) {
      return prisma.laundryOccurrenceStatus.findMany({
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
      laundryTypeId: string,
      date: Date,
      data: { done?: boolean; postponedToDate?: Date | null },
    ) {
      return prisma.laundryOccurrenceStatus.upsert({
        where: { laundryTypeId_date: { laundryTypeId, date } },
        create: { familyId, laundryTypeId, date, ...data },
        update: data,
      });
    },
  };
}

export type LaundryRepository = ReturnType<typeof createLaundryRepository>;
