import type { NotificationCategory } from '@prisma/client';
import type { Db } from '../database/types.js';

export function createNotificationPreferenceRepository(prisma: Db) {
  return {
    /** Only the disabled rows for this (userIds, category) pair — absence of a row means "on",
     * so callers just subtract this set from the full recipient list. */
    async listDisabledUserIds(userIds: string[], category: NotificationCategory): Promise<Set<string>> {
      if (userIds.length === 0) return new Set();
      const rows = await prisma.notificationPreference.findMany({
        where: { userId: { in: userIds }, category, enabled: false },
        select: { userId: true },
      });
      return new Set(rows.map((r) => r.userId));
    },

    listForUser(userId: string) {
      return prisma.notificationPreference.findMany({ where: { userId } });
    },

    upsert(userId: string, category: NotificationCategory, enabled: boolean) {
      return prisma.notificationPreference.upsert({
        where: { userId_category: { userId, category } },
        create: { userId, category, enabled },
        update: { enabled },
      });
    },
  };
}

export type NotificationPreferenceRepository = ReturnType<typeof createNotificationPreferenceRepository>;
