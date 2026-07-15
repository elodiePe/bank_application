import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createStockService } from '../services/stockService.js';
import { createStockController } from '../controllers/stockController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createStockRouter(prisma: PrismaClient) {
  const stockService = createStockService(prisma);
  const controller = createStockController(stockService);

  const router = Router();
  router.use(authenticate);

  // Search/quote: available to any authenticated member (a child browsing needs it as
  // much as a parent reviewing a pending order).
  router.get('/search', asyncHandler((req, res) => controller.search(req, res)));
  router.get('/quote/:symbol', asyncHandler((req, res) => controller.getQuote(req, res)));

  router.get(
    '/portfolio',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.getMyPortfolio(req, res)),
  );
  router.get(
    '/portfolio/:accountId',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.getChildPortfolio(req, res)),
  );
  router.get(
    '/lots/:symbol',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.getMyLots(req, res)),
  );
  router.get(
    '/lots/:accountId/:symbol',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.getChildLots(req, res)),
  );

  router.post(
    '/orders',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.createOrder(req, res)),
  );
  router.post(
    '/gift',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.gift(req, res)),
  );
  router.get(
    '/orders/mine',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.listMine(req, res)),
  );
  router.get(
    '/orders/pending',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.listPending(req, res)),
  );
  router.post(
    '/orders/:id/approve',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.approve(req, res)),
  );
  router.post(
    '/orders/:id/reject',
    requireRole('PARENT'),
    asyncHandler((req, res) => controller.reject(req, res)),
  );
  router.post(
    '/orders/:id/cancel',
    requireRole('CHILD'),
    asyncHandler((req, res) => controller.cancel(req, res)),
  );

  return router;
}
