import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createChoreService } from '../services/choreService.js';
import { createChoreController } from '../controllers/choreController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequirePermission } from '../middleware/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createChoreRouter(prisma: PrismaClient) {
  const choreService = createChoreService(prisma);
  const controller = createChoreController(choreService);
  const requirePermission = createRequirePermission(prisma);

  const router = Router();
  router.use(authenticate);

  router.get(
    '/mine',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.listMyChores(req, res)),
  );
  router.post(
    '/:id/complete',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.complete(req, res)),
  );

  const parentRouter = Router();
  parentRouter.use(requireRole('PARENT'));
  parentRouter.get('/', asyncHandler((req, res) => controller.listFamilyChores(req, res)));
  parentRouter.get('/pending', asyncHandler((req, res) => controller.listPendingCompletions(req, res)));
  parentRouter.post(
    '/',
    requirePermission('canManageMoney'),
    asyncHandler((req, res) => controller.create(req, res)),
  );
  parentRouter.patch(
    '/:id',
    requirePermission('canManageMoney'),
    asyncHandler((req, res) => controller.update(req, res)),
  );
  parentRouter.post(
    '/completions/:completionId/approve',
    requirePermission('canManageMoney'),
    asyncHandler((req, res) => controller.approve(req, res)),
  );
  parentRouter.post(
    '/completions/:completionId/reject',
    requirePermission('canManageMoney'),
    asyncHandler((req, res) => controller.reject(req, res)),
  );

  router.use(parentRouter);

  return router;
}
