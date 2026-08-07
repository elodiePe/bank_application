import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createStripeService } from '../services/stripeService.js';
import { createBillingController } from '../controllers/billingController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequirePermission } from '../middleware/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** The webhook route is mounted separately, in app.ts, BEFORE express.json() — Stripe
 * signature verification needs the exact raw request body, which express.json() would
 * otherwise have already parsed and discarded. This router only holds the authenticated
 * family-facing endpoints. */
export function createBillingRouter(prisma: PrismaClient) {
  const stripeService = createStripeService(prisma);
  const controller = createBillingController(stripeService);
  const requirePermission = createRequirePermission(prisma);

  const router = Router();
  router.use(authenticate);

  // Read is available to any authenticated member (a child's settings page shows the same
  // tier badge as the parent's); only a parent who can manage settings can start/change billing.
  router.get('/subscription', asyncHandler((req, res) => controller.getSubscription(req, res)));
  router.post(
    '/checkout-session',
    requireRole('PARENT'),
    requirePermission('canManageSettings'),
    asyncHandler((req, res) => controller.createCheckoutSession(req, res)),
  );
  router.post(
    '/portal-session',
    requireRole('PARENT'),
    requirePermission('canManageSettings'),
    asyncHandler((req, res) => controller.createPortalSession(req, res)),
  );

  return router;
}

export function createBillingWebhookHandler(prisma: PrismaClient) {
  const stripeService = createStripeService(prisma);
  const controller = createBillingController(stripeService);
  return asyncHandler((req, res) => controller.webhook(req, res));
}
