import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createPointsRewardService } from '../services/pointsRewardService.js';
import { createPointsRewardController } from '../controllers/pointsRewardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createPointsRewardRouter(prisma: PrismaClient) {
  const pointsRewardService = createPointsRewardService(prisma);
  const controller = createPointsRewardController(pointsRewardService);

  const router = Router();
  router.use(authenticate);

  // Both roles can see the reward ladder; only a parent defines it.
  router.get('/', asyncHandler((req, res) => controller.list(req, res)));

  const parentRouter = Router();
  parentRouter.use(requireRole('PARENT'));
  parentRouter.post('/', asyncHandler((req, res) => controller.create(req, res)));
  parentRouter.delete('/:id', asyncHandler((req, res) => controller.remove(req, res)));

  router.use(parentRouter);

  return router;
}
