import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createMoneyRequestService } from '../services/moneyRequestService.js';
import { createMoneyRequestController } from '../controllers/moneyRequestController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createMoneyRequestRouter(prisma: PrismaClient) {
  const moneyRequestService = createMoneyRequestService(prisma);
  const controller = createMoneyRequestController(moneyRequestService);

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
  // Approve/reject: authorization (parent vs. targeted sibling) is enforced in the service,
  // since it depends on the request's own type/target rather than a single fixed role.
  router.post('/:id/approve', asyncHandler((req, res) => controller.approve(req, res)));
  router.post('/:id/reject', asyncHandler((req, res) => controller.reject(req, res)));
  router.post(
    '/:id/cancel',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.cancel(req, res)),
  );

  return router;
}
