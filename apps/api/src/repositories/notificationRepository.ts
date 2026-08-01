import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

export function createNotificationRepository(prisma: Db) {
  return {
    create(data: Prisma.NotificationCreateManyInput) {
      return prisma.notification.create({ data });
    },

    createMany(data: Prisma.NotificationCreateManyInput[]) {
      return prisma.notification.createMany({ data });
    },

    listForUser(userId: string, limit = 30) {
      return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    },

    /// Scoped to `userId` so a guessed/stale id can never delete another member's notification —
    /// each row belongs to exactly one recipient, so deleting it here doesn't touch anyone else's.
    async deleteOne(id: string, userId: string) {
      await prisma.notification.deleteMany({ where: { id, userId } });
    },

    async deleteAllForUser(userId: string) {
      await prisma.notification.deleteMany({ where: { userId } });
    },
  };
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
