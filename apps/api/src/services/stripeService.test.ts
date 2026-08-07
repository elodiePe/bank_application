import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

// Fixed test price ids, mapped to tiers exactly like a real deployment would via env vars —
// mocked here so this test never needs a real Stripe account or network access.
vi.mock('../utils/env.js', () => ({
  env: {
    webAppUrl: 'http://localhost:5173',
    stripeSecretKey: undefined,
    stripeWebhookSecret: undefined,
    stripePriceFamille: 'price_famille_test',
    stripePriceGrandeFamille: 'price_grande_famille_test',
  },
}));

// Never let tests reach a real email provider.
vi.mock('./emailService.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createStripeService, type StripeService } from './stripeService.js';

function fakeSubscription(overrides: Partial<Stripe.Subscription> & { priceId?: string; periodEnd?: number }): Stripe.Subscription {
  const { priceId = 'price_famille_test', periodEnd = Math.floor(Date.now() / 1000) + 3600, ...rest } = overrides;
  return {
    id: 'sub_test_1',
    customer: 'cus_test_1',
    status: 'active',
    metadata: {},
    items: {
      object: 'list',
      data: [
        {
          id: 'si_test_1',
          price: { id: priceId },
          current_period_end: periodEnd,
        },
      ],
    },
    ...rest,
  } as unknown as Stripe.Subscription;
}

describe('stripeService.applyWebhookEvent (seeded demo family)', () => {
  let db: TestDb;
  let stripeService: StripeService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    await db.prisma.family.update({ where: { id: 'demo-family' }, data: { stripeCustomerId: 'cus_test_1' } });
    stripeService = createStripeService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('upgrades the family tier on an active subscription resolved via metadata.familyId', async () => {
    const subscription = fakeSubscription({ metadata: { familyId: 'demo-family' }, priceId: 'price_famille_test' });

    await stripeService.applyWebhookEvent({
      type: 'customer.subscription.updated',
      data: { object: subscription },
    } as unknown as Stripe.Event);

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });
    expect(family.subscriptionTier).toBe('FAMILLE');
    expect(family.stripeSubscriptionStatus).toBe('active');
    expect(family.stripeSubscriptionId).toBe('sub_test_1');
  });

  it('falls back to resolving the family via stripeCustomerId when metadata is absent', async () => {
    const subscription = fakeSubscription({ metadata: {}, priceId: 'price_grande_famille_test' });

    await stripeService.applyWebhookEvent({
      type: 'customer.subscription.updated',
      data: { object: subscription },
    } as unknown as Stripe.Event);

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });
    expect(family.subscriptionTier).toBe('GRANDE_FAMILLE');
  });

  it('reverts the family to ESSENTIEL once the subscription is canceled, and starts the payment grace period', async () => {
    const subscription = fakeSubscription({
      metadata: { familyId: 'demo-family' },
      status: 'canceled',
      priceId: 'price_grande_famille_test',
    });

    await stripeService.applyWebhookEvent({
      type: 'customer.subscription.deleted',
      data: { object: subscription },
    } as unknown as Stripe.Event);

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });
    expect(family.subscriptionTier).toBe('ESSENTIEL');
    expect(family.stripeSubscriptionStatus).toBe('canceled');
    expect(family.paymentGracePeriodStartedAt).not.toBeNull();

    const notifications = await db.prisma.notification.findMany({ where: { type: 'PAYMENT_PAST_DUE' } });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('does not restart an already-running grace period on a second inactive event', async () => {
    const before = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });

    const subscription = fakeSubscription({
      metadata: { familyId: 'demo-family' },
      status: 'unpaid',
      priceId: 'price_grande_famille_test',
    });
    await stripeService.applyWebhookEvent({
      type: 'customer.subscription.updated',
      data: { object: subscription },
    } as unknown as Stripe.Event);

    const after = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });
    expect(after.paymentGracePeriodStartedAt?.getTime()).toBe(before.paymentGracePeriodStartedAt?.getTime());
  });

  it('clears the grace period once the subscription becomes active again', async () => {
    const subscription = fakeSubscription({
      metadata: { familyId: 'demo-family' },
      status: 'active',
      priceId: 'price_grande_famille_test',
    });

    await stripeService.applyWebhookEvent({
      type: 'customer.subscription.updated',
      data: { object: subscription },
    } as unknown as Stripe.Event);

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });
    expect(family.subscriptionTier).toBe('GRANDE_FAMILLE');
    expect(family.paymentGracePeriodStartedAt).toBeNull();
    expect(family.paymentGraceReminderSentAt).toBeNull();
  });

  it('silently ignores an event for a customer id that matches no family', async () => {
    const subscription = fakeSubscription({ metadata: {}, customer: 'cus_unknown' });

    await expect(
      stripeService.applyWebhookEvent({
        type: 'customer.subscription.updated',
        data: { object: subscription },
      } as unknown as Stripe.Event),
    ).resolves.toBeUndefined();
  });

  it('ignores event types it does not handle', async () => {
    await expect(
      stripeService.applyWebhookEvent({ type: 'invoice.paid', data: { object: {} } } as unknown as Stripe.Event),
    ).resolves.toBeUndefined();
  });
});
