import Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import type {
  CheckoutReturnPath,
  PaidSubscriptionTier,
  SubscriptionSummary,
  SubscriptionTier,
} from '@banque-familiale/shared';
import {
  SUBSCRIPTION_TIER_MAX_CHILDREN,
  SUBSCRIPTION_TIER_MAX_PARENTS,
  SUBSCRIPTION_TIER_SECTIONS_UNLOCKED,
} from '@banque-familiale/shared';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createNotificationService } from './notificationService.js';
import { sendEmail } from './emailService.js';
import { paymentPastDueTemplate } from '../emails/templates.js';
import { env } from '../utils/env.js';
import { ExternalServiceError, NotFoundError, ValidationError } from '../utils/errors.js';

/** Pinned rather than left to the account default, so a Stripe dashboard change to the
 * account's default API version can never silently change this integration's behavior. */
const STRIPE_API_VERSION = '2026-07-29.dahlia';

function getStripeClient(): Stripe {
  if (!env.stripeSecretKey) {
    throw new ExternalServiceError("La facturation n'est pas configurée sur ce serveur.");
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
}

function priceIdForTier(tier: PaidSubscriptionTier): string {
  const priceId = tier === 'FAMILLE' ? env.stripePriceFamille : env.stripePriceGrandeFamille;
  if (!priceId) throw new ExternalServiceError(`Aucun prix Stripe configuré pour le plan ${tier}.`);
  return priceId;
}

function tierForPriceId(priceId: string | null): PaidSubscriptionTier | null {
  if (!priceId) return null;
  if (priceId === env.stripePriceFamille) return 'FAMILLE';
  if (priceId === env.stripePriceGrandeFamille) return 'GRANDE_FAMILLE';
  return null;
}

export function createStripeService(prisma: PrismaClient) {
  const familyRepo = createFamilyRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const notificationService = createNotificationService(prisma);

  async function ensureStripeCustomer(family: {
    id: string;
    stripeCustomerId: string | null;
    ownerEmail: string;
    name: string;
  }): Promise<string> {
    if (family.stripeCustomerId) return family.stripeCustomerId;
    const stripe = getStripeClient();
    const customer = await stripe.customers.create({
      email: family.ownerEmail,
      name: family.name,
      // Lets a webhook resolve customer.subscription.* events straight back to a family even
      // in the rare case the id-based lookup below (customer id stored on Family) misses.
      metadata: { familyId: family.id },
    });
    await familyRepo.setStripeCustomerId(family.id, customer.id);
    return customer.id;
  }

  /** The only function allowed to change subscriptionTier — always fed a Stripe object that
   * came from a signature-verified webhook event, never from client input. Upserts the full
   * known state every time, so redelivered/out-of-order webhook events are naturally
   * idempotent instead of needing explicit dedupe bookkeeping. */
  async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const familyIdFromMetadata = subscription.metadata?.familyId;
    const family = familyIdFromMetadata
      ? await familyRepo.findById(familyIdFromMetadata)
      : await familyRepo.findByStripeCustomerId(customerId);
    if (!family) return; // Unknown customer (e.g. a Stripe test event on an unrelated account) — nothing to sync.

    const item = subscription.items.data[0];
    const priceId = item?.price.id ?? null;
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const wasPaid = family.subscriptionTier !== 'ESSENTIEL';
    const tier: SubscriptionTier = isActive ? (tierForPriceId(priceId) ?? family.subscriptionTier) : 'ESSENTIEL';

    await familyRepo.updateSubscriptionFromStripe(family.id, {
      subscriptionTier: tier,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    });

    // A subscription that WAS paid just dropped out of active/trialing — start the 30-day
    // countdown to deletion (see paymentGraceService) and warn the family once, right now.
    if (!isActive && wasPaid && !family.paymentGracePeriodStartedAt) {
      await familyRepo.startPaymentGracePeriod(family.id);
      await notificationService.notifyPaymentGracePeriodStarted(family.id);
      const { subject, html } = paymentPastDueTemplate({
        familyName: family.name,
        billingUrl: `${env.webAppUrl}/settings`,
      });
      await sendEmail({ to: family.ownerEmail, subject, html });
    }

    // Payment recovered (subscription active again) — cancel the countdown entirely.
    if (isActive && family.paymentGracePeriodStartedAt) {
      await familyRepo.clearPaymentGracePeriod(family.id);
    }
  }

  return {
    async getSubscription(familyId: string): Promise<SubscriptionSummary> {
      const family = await familyRepo.findById(familyId);
      if (!family) throw new NotFoundError('Famille introuvable');
      const maxChildren = SUBSCRIPTION_TIER_MAX_CHILDREN[family.subscriptionTier];
      const activeChildren = maxChildren !== null ? await userRepo.countActiveChildren(familyId) : 0;
      return {
        tier: family.subscriptionTier,
        status: family.stripeSubscriptionStatus,
        currentPeriodEnd: family.stripeCurrentPeriodEnd ? family.stripeCurrentPeriodEnd.toISOString() : null,
        maxChildren,
        maxParents: SUBSCRIPTION_TIER_MAX_PARENTS[family.subscriptionTier],
        sectionsUnlocked: SUBSCRIPTION_TIER_SECTIONS_UNLOCKED[family.subscriptionTier],
        childrenOverLimit: maxChildren !== null ? Math.max(0, activeChildren - maxChildren) : 0,
      };
    },

    /** Hosted Stripe Checkout — card details are entered on Stripe's own page and never touch
     * our frontend or backend, keeping this integration outside PCI card-data scope entirely. */
    async createCheckoutSession(params: {
      familyId: string;
      tier: PaidSubscriptionTier;
      returnTo?: CheckoutReturnPath;
    }): Promise<{ url: string }> {
      const family = await familyRepo.findById(params.familyId);
      if (!family) throw new NotFoundError('Famille introuvable');

      const stripe = getStripeClient();
      const customerId = await ensureStripeCustomer(family);
      const priceId = priceIdForTier(params.tier);
      const returnPath = params.returnTo ?? '/settings';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${env.webAppUrl}${returnPath}?checkout=success`,
        cancel_url: `${env.webAppUrl}${returnPath}?checkout=cancelled`,
        subscription_data: { metadata: { familyId: family.id } },
        client_reference_id: family.id,
      });

      if (!session.url) throw new ExternalServiceError("Stripe n'a pas retourné d'URL de paiement.");
      return { url: session.url };
    },

    /** Stripe's own hosted page for a family to update their card, view invoices, or cancel —
     * subscriptionTier only ever moves once the resulting webhook event confirms the change. */
    async createPortalSession(familyId: string): Promise<{ url: string }> {
      const family = await familyRepo.findById(familyId);
      if (!family) throw new NotFoundError('Famille introuvable');
      if (!family.stripeCustomerId) {
        throw new ValidationError("Aucun abonnement à gérer pour l'instant.");
      }

      const stripe = getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: family.stripeCustomerId,
        return_url: `${env.webAppUrl}/settings`,
      });
      return { url: session.url };
    },

    /** Verifies the Stripe-Signature header against the exact raw request body — this is what
     * proves a /billing/webhook request actually came from Stripe and wasn't forged by a
     * client claiming "I paid". Throws if the signature doesn't match. */
    constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
      if (!env.stripeWebhookSecret) {
        throw new ExternalServiceError("Le webhook Stripe n'est pas configuré sur ce serveur.");
      }
      const stripe = getStripeClient();
      return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
    },

    async applyWebhookEvent(event: Stripe.Event): Promise<void> {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (!session.subscription) break;
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const stripe = getStripeClient();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          await syncSubscription(event.data.object as Stripe.Subscription);
          break;
        }
        default:
          break;
      }
    },
  };
}

export type StripeService = ReturnType<typeof createStripeService>;
