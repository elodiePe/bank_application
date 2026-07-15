import type { Db } from '../database/types.js';

export interface SubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function createPushSubscriptionRepository(prisma: Db) {
  return {
    upsert(userId: string, keys: SubscriptionKeys) {
      return prisma.pushSubscription.upsert({
        where: { endpoint: keys.endpoint },
        create: { userId, ...keys },
        // A device re-subscribing (e.g. after clearing storage) gets reassigned
        // to whichever user is currently logged in on it.
        update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      });
    },

    removeByEndpoint(endpoint: string) {
      return prisma.pushSubscription.deleteMany({ where: { endpoint } });
    },

    listForUser(userId: string) {
      return prisma.pushSubscription.findMany({ where: { userId } });
    },

    listForUsers(userIds: string[]) {
      return prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    },
  };
}

export type PushSubscriptionRepository = ReturnType<typeof createPushSubscriptionRepository>;
