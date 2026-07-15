import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createDashboardService } from '../services/dashboardService.js';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { createMoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createDashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createDashboardRouter(prisma: PrismaClient) {
  const dashboardService = createDashboardService({
    familyRepository: createFamilyRepository(prisma),
    moneyRequestRepository: createMoneyRequestRepository(prisma),
    transactionRepository: createTransactionRepository(prisma),
    childAccountRepository: createChildAccountRepository(prisma),
    userRepository: createUserRepository(prisma),
  });
  const controller = createDashboardController(dashboardService);

  const router = Router();
  router.use(authenticate);

  router.get(
    '/overview',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.getOverview(req, res)),
  );
  router.get(
    '/recent-transactions',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.getRecentTransactions(req, res)),
  );
  router.get(
    '/me/overview',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.getMyOverview(req, res)),
  );
  router.get(
    '/me/transactions',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.getMyTransactions(req, res)),
  );
  router.get(
    '/transactions/search',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.searchTransactions(req, res)),
  );
  router.get(
    '/me/transactions/search',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.searchMyTransactions(req, res)),
  );

  return router;
}
