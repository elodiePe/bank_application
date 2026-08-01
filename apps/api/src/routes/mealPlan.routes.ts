import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createMealPlanService } from '../services/mealPlanService.js';
import { createMealPlanController } from '../controllers/mealPlanController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequireParentOrTeen } from '../middleware/requireParentOrTeen.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createMealPlanRouter(prisma: PrismaClient) {
  const mealPlanService = createMealPlanService(prisma);
  const controller = createMealPlanController(mealPlanService);
  const requireParentOrTeen = createRequireParentOrTeen(prisma);

  const router = Router();
  router.use(authenticate);

  // Both roles can see who's cooking, and mark/postpone their own turn; a parent or a
  // TEEN-interface child can change the plan itself — younger children can't.
  router.get('/', asyncHandler((req, res) => controller.list(req, res)));
  router.get('/upcoming', asyncHandler((req, res) => controller.listUpcoming(req, res)));
  router.get('/rotation-order', asyncHandler((req, res) => controller.getRotationOrder(req, res)));
  router.patch('/occurrence-status', asyncHandler((req, res) => controller.setOccurrenceStatus(req, res)));
  router.put('/day', requireParentOrTeen, asyncHandler((req, res) => controller.setDay(req, res)));
  router.put(
    '/rotation-order',
    requireParentOrTeen,
    asyncHandler((req, res) => controller.setRotationOrder(req, res)),
  );

  // The "turn a meal into a chore" reward config is a money/points decision — stays
  // parent-only regardless of interface level.
  const parentRouter = Router();
  parentRouter.use(requireRole('PARENT'));
  parentRouter.get('/chore-config', asyncHandler((req, res) => controller.getChoreConfig(req, res)));
  parentRouter.put('/chore-config', asyncHandler((req, res) => controller.setChoreConfig(req, res)));

  router.use(parentRouter);

  return router;
}
