import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createShoppingListService } from '../services/shoppingListService.js';
import { createShoppingListController } from '../controllers/shoppingListController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createShoppingListRouter(prisma: PrismaClient) {
  const shoppingListService = createShoppingListService(prisma);
  const controller = createShoppingListController(shoppingListService);

  const router = Router();
  router.use(authenticate);

  // Fully collaborative — any family member (parent or child) can add, check off, or
  // remove an item.
  router.get('/', asyncHandler((req, res) => controller.list(req, res)));
  router.post('/', asyncHandler((req, res) => controller.create(req, res)));
  router.patch('/:id/checked', asyncHandler((req, res) => controller.setChecked(req, res)));
  router.delete('/:id', asyncHandler((req, res) => controller.remove(req, res)));

  return router;
}
