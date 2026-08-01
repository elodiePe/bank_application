import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createNotificationService } from '../services/notificationService.js';
import { createPushService } from '../services/pushService.js';
import { createNotificationController } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createNotificationRouter(prisma: PrismaClient) {
  const notificationService = createNotificationService(prisma);
  const pushService = createPushService(prisma);
  const controller = createNotificationController(notificationService, pushService);

  const router = Router();
  router.use(authenticate);

  router.get('/', asyncHandler((req, res) => controller.listMine(req, res)));
  router.delete('/:id', asyncHandler((req, res) => controller.deleteOne(req, res)));
  router.delete('/', asyncHandler((req, res) => controller.deleteAll(req, res)));

  router.get('/push/vapid-public-key', asyncHandler((req, res) => controller.vapidPublicKey(req, res)));
  router.post('/push/subscribe', asyncHandler((req, res) => controller.subscribePush(req, res)));
  router.post('/push/unsubscribe', asyncHandler((req, res) => controller.unsubscribePush(req, res)));

  return router;
}
