import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createMoneyService } from '../services/moneyService.js';
import { createNotificationService } from '../services/notificationService.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createTransactionActionsController } from '../controllers/transactionActionsController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createTransactionActionsRouter(prisma: PrismaClient) {
  const moneyService = createMoneyService(prisma);
  const notificationService = createNotificationService(prisma);
  const controller = createTransactionActionsController(
    moneyService,
    notificationService,
    createChildAccountRepository(prisma),
  );

  const router = Router();
  router.use(authenticate, requireRole('PARENT'));

  router.post('/deposit', asyncHandler((req, res) => controller.deposit(req, res)));
  router.post('/withdrawal', asyncHandler((req, res) => controller.withdrawal(req, res)));
  router.post('/transfer', asyncHandler((req, res) => controller.transfer(req, res)));
  router.post('/:id/correct', asyncHandler((req, res) => controller.correct(req, res)));

  return router;
}
