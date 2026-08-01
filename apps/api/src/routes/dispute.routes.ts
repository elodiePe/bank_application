import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createDisputeService } from '../services/disputeService.js';
import { createDisputeController } from '../controllers/disputeController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequirePermission } from '../middleware/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createDisputeRouter(prisma: PrismaClient) {
  const disputeService = createDisputeService(prisma);
  const controller = createDisputeController(disputeService);
  const requirePermission = createRequirePermission(prisma);

  const router = Router();
  router.use(authenticate);

  router.post(
    '/',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.create(req, res)),
  );
  router.get(
    '/mine',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.listMine(req, res)),
  );
  router.get(
    '/pending',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.listPending(req, res)),
  );
  router.post(
    '/:id/dismiss',
    requireRole('PARENT'),
    requirePermission('canManageActions'),
    asyncHandler((req, res) => controller.dismiss(req, res)),
  );
  router.post(
    '/:id/resolve',
    requireRole('PARENT'),
    requirePermission('canManageActions'),
    asyncHandler((req, res) => controller.resolve(req, res)),
  );
  // Only the raising child can ever see a resolved dispute (see disputeService.clear) — no
  // requireRole needed beyond auth, the service checks ownership directly.
  router.post('/:id/clear', asyncHandler((req, res) => controller.clear(req, res)));

  return router;
}
