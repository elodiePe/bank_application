import webpush from 'web-push';
import type { PrismaClient } from '@prisma/client';
import { createPushSubscriptionRepository, type SubscriptionKeys } from '../repositories/pushSubscriptionRepository.js';
import { env } from '../utils/env.js';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

const isConfigured = Boolean(env.vapidPublicKey && env.vapidPrivateKey);

if (isConfigured) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey!, env.vapidPrivateKey!);
} else {
  console.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled.');
}

export function createPushService(prisma: PrismaClient) {
  const repo = createPushSubscriptionRepository(prisma);

  return {
    isConfigured,

    saveSubscription(userId: string, keys: SubscriptionKeys) {
      return repo.upsert(userId, keys);
    },

    removeSubscription(endpoint: string) {
      return repo.removeByEndpoint(endpoint);
    },

    /** Best-effort: a push failure must never break the caller's main operation. */
    async sendToUser(userId: string, payload: PushPayload) {
      if (!isConfigured) return;
      const subscriptions = await repo.listForUser(userId);
      await sendToSubscriptions(repo, subscriptions, payload);
    },

    async sendToUsers(userIds: string[], payload: PushPayload) {
      if (!isConfigured || userIds.length === 0) return;
      const subscriptions = await repo.listForUsers(userIds);
      await sendToSubscriptions(repo, subscriptions, payload);
    },
  };
}

async function sendToSubscriptions(
  repo: ReturnType<typeof createPushSubscriptionRepository>,
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
) {
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // The browser/OS dropped this subscription — stop trying it.
          await repo.removeByEndpoint(sub.endpoint);
        } else {
          console.error('[push] send failed', statusCode, error);
        }
      }
    }),
  );
}

export type PushService = ReturnType<typeof createPushService>;
