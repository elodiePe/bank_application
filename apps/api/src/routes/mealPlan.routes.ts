import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createMealPlanService } from '../services/mealPlanService.js';
import { createMealPlanController } from '../controllers/mealPlanController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createMealPlanRouter(prisma: PrismaClient) {
  const mealPlanService = createMealPlanService(prisma);
  const controller = createMealPlanController(mealPlanService);

  const router = Router();
  router.use(authenticate);

  // Both roles can see who's cooking; only a parent can change the plan.
  router.get('/', asyncHandler((req, res) => controller.list(req, res)));
  router.get('/upcoming', asyncHandler((req, res) => controller.listUpcoming(req, res)));
  router.get('/rotation-order', asyncHandler((req, res) => controller.getRotationOrder(req, res)));

  const parentRouter = Router();
  parentRouter.use(requireRole('PARENT'));
  parentRouter.put('/day', asyncHandler((req, res) => controller.setDay(req, res)));
  parentRouter.put('/rotation-order', asyncHandler((req, res) => controller.setRotationOrder(req, res)));

  router.use(parentRouter);

  return router;
}
