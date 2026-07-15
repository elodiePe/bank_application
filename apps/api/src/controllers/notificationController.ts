import type { Request, Response } from 'express';
import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@banque-familiale/shared';
import type { NotificationService } from '../services/notificationService.js';
import type { PushService } from '../services/pushService.js';
import { env } from '../utils/env.js';
import { ValidationError } from '../utils/errors.js';

export function createNotificationController(notificationService: NotificationService, pushService: PushService) {
  return {
    async listMine(req: Request, res: Response) {
      const notifications = await notificationService.listMine(req.auth!.sub);
      res.json(notifications);
    },

    async unreadCount(req: Request, res: Response) {
      const count = await notificationService.countUnread(req.auth!.sub);
      res.json({ count });
    },

    async markAsRead(req: Request, res: Response) {
      await notificationService.markAsRead(String(req.params.id), req.auth!.sub);
      res.status(204).end();
    },

    async markAllAsRead(req: Request, res: Response) {
      await notificationService.markAllAsRead(req.auth!.sub);
      res.status(204).end();
    },

    async vapidPublicKey(_req: Request, res: Response) {
      res.json({ publicKey: pushService.isConfigured ? env.vapidPublicKey : null });
    },

    async subscribePush(req: Request, res: Response) {
      const parsed = pushSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await pushService.saveSubscription(req.auth!.sub, parsed.data);
      res.status(204).end();
    },

    async unsubscribePush(req: Request, res: Response) {
      const parsed = pushUnsubscribeSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await pushService.removeSubscription(parsed.data.endpoint);
      res.status(204).end();
    },
  };
}

export type NotificationController = ReturnType<typeof createNotificationController>;
