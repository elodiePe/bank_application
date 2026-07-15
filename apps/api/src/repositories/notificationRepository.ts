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

    countUnread(userId: string) {
      return prisma.notification.count({ where: { userId, isRead: false } });
    },

    async markAsRead(id: string, userId: string) {
      await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    },

    async markAllAsRead(userId: string) {
      await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    },
  };
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
