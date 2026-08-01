import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createCustomNotificationService } from '../services/customNotificationService.js';
import { createCustomNotificationController } from '../controllers/customNotificationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createCustomNotificationRouter(prisma: PrismaClient) {
  const service = createCustomNotificationService(prisma);
  const controller = createCustomNotificationController(service);

  const router = Router();
  router.use(authenticate);
  router.use(requireRole('PARENT'));

  router.get('/', asyncHandler((req, res) => controller.list(req, res)));
  router.post('/', asyncHandler((req, res) => controller.create(req, res)));
  router.delete('/:id', asyncHandler((req, res) => controller.remove(req, res)));

  return router;
}
