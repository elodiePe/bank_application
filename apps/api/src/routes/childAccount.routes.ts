import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAllowanceService } from '../services/allowanceService.js';
import { createChildAccountController } from '../controllers/childAccountController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequirePermission } from '../middleware/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createChildAccountRouter(prisma: PrismaClient) {
  const allowanceService = createAllowanceService(prisma);
  const controller = createChildAccountController(allowanceService);
  const requirePermission = createRequirePermission(prisma);

  const router = Router();
  router.use(authenticate, requireRole('PARENT'), requirePermission('canManageSettings'));

  router.put(
    '/:accountId/allowance',
    asyncHandler((req, res) => controller.setWeeklyAllowance(req, res)),
  );

  return router;
}
