import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createDashboardService } from '../services/dashboardService.js';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { createMoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createDashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export function createDashboardRouter(prisma: PrismaClient) {
  const dashboardService = createDashboardService({
    familyRepository: createFamilyRepository(prisma),
    moneyRequestRepository: createMoneyRequestRepository(prisma),
    transactionRepository: createTransactionRepository(prisma),
  });
  const controller = createDashboardController(dashboardService);

  const router = Router();
  router.use(authenticate, requireRole('PARENT'));

  router.get('/overview', (req, res) => controller.getOverview(req, res));
  router.get('/recent-transactions', (req, res) => controller.getRecentTransactions(req, res));

  return router;
}
