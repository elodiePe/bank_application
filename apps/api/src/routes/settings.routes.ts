import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createSettingsService } from '../services/settingsService.js';
import { createSettingsController } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createSettingsRouter(prisma: PrismaClient) {
  const settingsService = createSettingsService(prisma);
  const controller = createSettingsController(settingsService);

  const router = Router();
  router.use(authenticate);

  // Read is available to any authenticated member (children need the currency to
  // format their own dashboard); only parents can change these family-wide settings.
  router.get('/', asyncHandler((req, res) => controller.getSettings(req, res)));
  router.put(
    '/interest-rate',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.updateInterestRate(req, res)),
  );
  router.put(
    '/currency',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.updateCurrency(req, res)),
  );

  return router;
}
