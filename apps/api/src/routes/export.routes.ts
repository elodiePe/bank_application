import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createExportService } from '../services/exportService.js';
import { createExportController } from '../controllers/exportController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createExportRouter(prisma: PrismaClient) {
  const exportService = createExportService(prisma);
  const controller = createExportController(exportService);

  const router = Router();
  router.use(authenticate);

  // Data portability (GDPR Art. 20) — a parent can download everything the family
  // generated. Restricted to PARENT (not gated further by canManageSettings etc.) since
  // this is a personal-data right every parent has for their own family, not an
  // administrative permission that can be delegated away.
  router.get('/', requireRole('PARENT'), asyncHandler((req, res) => controller.exportFamilyData(req, res)));

  return router;
}
