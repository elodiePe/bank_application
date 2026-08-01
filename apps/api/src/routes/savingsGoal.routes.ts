import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createSavingsGoalService } from '../services/savingsGoalService.js';
import { createSavingsGoalController } from '../controllers/savingsGoalController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** A savings goal always belongs to the child themselves — a parent has no reason to set or
 * see one on their behalf, so this is CHILD-only, unlike PersonalTask which any role can use. */
export function createSavingsGoalRouter(prisma: PrismaClient) {
  const service = createSavingsGoalService(prisma);
  const controller = createSavingsGoalController(service);

  const router = Router();
  router.use(authenticate, requireRole('CHILD'));

  router.get('/mine', asyncHandler((req, res) => controller.getMine(req, res)));
  router.put('/mine', asyncHandler((req, res) => controller.upsertMine(req, res)));
  router.delete('/mine', asyncHandler((req, res) => controller.deleteMine(req, res)));

  return router;
}
