import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createLaundryService } from '../services/laundryService.js';
import { createLaundryController } from '../controllers/laundryController.js';
import { authenticate } from '../middleware/authenticate.js';
import { createRequireParentOrTeen } from '../middleware/requireParentOrTeen.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createLaundryRouter(prisma: PrismaClient) {
  const laundryService = createLaundryService(prisma);
  const controller = createLaundryController(laundryService);
  const requireParentOrTeen = createRequireParentOrTeen(prisma);

  const router = Router();
  router.use(authenticate);

  // Both roles can see the types and the upcoming schedule, and mark/postpone their own
  // occurrences; a parent or a TEEN-interface child configures the types themselves —
  // younger children can't.
  router.get('/', asyncHandler((req, res) => controller.list(req, res)));
  router.get('/upcoming', asyncHandler((req, res) => controller.listUpcoming(req, res)));
  router.patch('/occurrence-status', asyncHandler((req, res) => controller.setOccurrenceStatus(req, res)));
  router.post('/', requireParentOrTeen, asyncHandler((req, res) => controller.create(req, res)));
  router.put('/reorder', requireParentOrTeen, asyncHandler((req, res) => controller.reorder(req, res)));
  router.put('/:id', requireParentOrTeen, asyncHandler((req, res) => controller.update(req, res)));
  router.delete('/:id', requireParentOrTeen, asyncHandler((req, res) => controller.remove(req, res)));

  return router;
}
