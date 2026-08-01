import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';
import { weekdayIndex } from '../utils/dateWeek.js';

const withCreatedBy = { createdBy: true } satisfies Prisma.CustomNotificationInclude;

export function createCustomNotificationRepository(prisma: Db) {
  return {
    listForFamily(familyId: string) {
      return prisma.customNotification.findMany({
        where: { familyId },
        include: withCreatedBy,
        orderBy: { date: 'asc' },
      });
    },

    findById(id: string) {
      return prisma.customNotification.findUnique({ where: { id }, include: withCreatedBy });
    },

    create(data: {
      familyId: string;
      title: string;
      body: string;
      date: Date;
      recurring: boolean;
      time: string;
      sendToAll: boolean;
      recipientUserIds: string[];
      createdById: string;
    }) {
      return prisma.customNotification.create({ data, include: withCreatedBy });
    },

    delete(id: string) {
      return prisma.customNotification.delete({ where: { id } });
    },

    /** Every notification (across every family) due on `date` — recurring ones whose anchor
     * `date` shares this date's weekday, or one-time ones whose `date` matches exactly.
     * Scanned daily, the same way LaundryType/MealPlanSlot are. */
    async listDueForDate(date: Date, weekday: number) {
      const rows = await prisma.customNotification.findMany({
        where: { OR: [{ recurring: true }, { date }] },
      });
      return rows.filter((row) => (row.recurring ? weekdayIndex(row.date) === weekday : true));
    },

    findLog(customNotificationId: string, date: Date) {
      return prisma.customNotificationLog.findUnique({
        where: { customNotificationId_date: { customNotificationId, date } },
      });
    },

    createLog(customNotificationId: string, date: Date) {
      return prisma.customNotificationLog.create({ data: { customNotificationId, date } });
    },
  };
}

export type CustomNotificationRepository = ReturnType<typeof createCustomNotificationRepository>;
