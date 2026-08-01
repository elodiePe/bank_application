import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createPersonalTaskService } from '../services/personalTaskService.js';
import { createPersonalTaskController } from '../controllers/personalTaskController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Open to any authenticated family member — parent or child — since a personal task always
 * belongs to its own creator, never someone else. */
export function createPersonalTaskRouter(prisma: PrismaClient) {
  const service = createPersonalTaskService(prisma);
  const controller = createPersonalTaskController(service);

  const router = Router();
  router.use(authenticate);

  router.get('/mine', asyncHandler((req, res) => controller.listMine(req, res)));
  router.post('/', asyncHandler((req, res) => controller.create(req, res)));
  router.patch('/:id', asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/:id', asyncHandler((req, res) => controller.remove(req, res)));

  return router;
}
