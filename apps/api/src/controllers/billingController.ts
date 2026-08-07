import type { Request, Response } from 'express';
import { createCheckoutSessionSchema } from '@banque-familiale/shared';
import type { StripeService } from '../services/stripeService.js';
import { ValidationError } from '../utils/errors.js';

export function createBillingController(stripeService: StripeService) {
  return {
    async getSubscription(req: Request, res: Response) {
      const subscription = await stripeService.getSubscription(req.auth!.familyId);
      res.json(subscription);
    },

    async createCheckoutSession(req: Request, res: Response) {
      const parsed = createCheckoutSessionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const session = await stripeService.createCheckoutSession({
        familyId: req.auth!.familyId,
        tier: parsed.data.tier,
        returnTo: parsed.data.returnTo,
      });
      res.json(session);
    },

    async createPortalSession(req: Request, res: Response) {
      const session = await stripeService.createPortalSession(req.auth!.familyId);
      res.json(session);
    },

    /** No `authenticate` here — Stripe calls this directly, unauthenticated by cookie, so the
     * raw-body signature check inside stripeService.constructEvent is the entire trust
     * boundary for this endpoint. */
    async webhook(req: Request, res: Response) {
      const signature = req.headers['stripe-signature'];
      if (typeof signature !== 'string') {
        res.status(400).json({ error: 'MISSING_SIGNATURE' });
        return;
      }

      let event;
      try {
        event = stripeService.constructEvent(req.body as Buffer, signature);
      } catch {
        res.status(400).json({ error: 'INVALID_SIGNATURE' });
        return;
      }

      await stripeService.applyWebhookEvent(event);
      res.json({ received: true });
    },
  };
}

export type BillingController = ReturnType<typeof createBillingController>;
