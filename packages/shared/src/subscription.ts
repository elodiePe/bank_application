import { z } from 'zod';

export const SUBSCRIPTION_TIERS = ['ESSENTIEL', 'FAMILLE', 'GRANDE_FAMILLE'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  ESSENTIEL: 'Essentiel',
  FAMILLE: 'Famille',
  GRANDE_FAMILLE: 'Grande Famille',
};

/** null = illimité. Single source of truth for both the pricing page copy and server-side
 * enforcement (memberService rejects adding a child beyond this). Keep in sync with the
 * landing page's PRICING array. */
export const SUBSCRIPTION_TIER_MAX_CHILDREN: Record<SubscriptionTier, number | null> = {
  ESSENTIEL: 1,
  FAMILLE: 2,
  GRANDE_FAMILLE: null,
};

/** null = illimité. The free tier is meant for a single parent managing the account; both
 * paid tiers lift the cap entirely (co-parents, blended families, grandparents helping out). */
export const SUBSCRIPTION_TIER_MAX_PARENTS: Record<SubscriptionTier, number | null> = {
  ESSENTIEL: 1,
  FAMILLE: null,
  GRANDE_FAMILLE: null,
};

/** Essentiel unlocks only l'argent de poche et les corvées; the two paid tiers unlock every
 * other section (repas, courses, lessive, bourse) — enforced in settingsService when a parent
 * tries to turn a section on. */
export const SUBSCRIPTION_TIER_SECTIONS_UNLOCKED: Record<SubscriptionTier, boolean> = {
  ESSENTIEL: false,
  FAMILLE: true,
  GRANDE_FAMILLE: true,
};

/** Display-only monthly-equivalent figure — the real charge is the annual one below,
 * billed once a year via Stripe. Mirrors LandingPage.tsx's PRICING array. */
export const SUBSCRIPTION_TIER_MONTHLY_CHF: Record<SubscriptionTier, number> = {
  ESSENTIEL: 0,
  FAMILLE: 1,
  GRANDE_FAMILLE: 2,
};

export const SUBSCRIPTION_TIER_ANNUAL_CHF: Record<SubscriptionTier, number> = {
  ESSENTIEL: 0,
  FAMILLE: 12,
  GRANDE_FAMILLE: 24,
};

/** Only the two paid tiers can be the target of a checkout — you can't "buy" Essentiel,
 * you just stay on it (or cancel down to it via the billing portal). */
export const paidSubscriptionTierSchema = z.enum(['FAMILLE', 'GRANDE_FAMILLE']);
export type PaidSubscriptionTier = z.infer<typeof paidSubscriptionTierSchema>;

/** Where Stripe sends the browser back to after checkout. Kept to a fixed allow-list (not a
 * free-form string) so this can never become an open redirect. */
export const checkoutReturnPathSchema = z.enum(['/settings', '/onboarding']);
export type CheckoutReturnPath = z.infer<typeof checkoutReturnPathSchema>;

export const createCheckoutSessionSchema = z.object({
  tier: paidSubscriptionTierSchema,
  returnTo: checkoutReturnPathSchema.optional(),
});
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export interface SubscriptionSummary {
  tier: SubscriptionTier;
  /** Stripe's own status string (active, past_due, canceled, ...) — null if the family has
   * never started a subscription. */
  status: string | null;
  currentPeriodEnd: string | null;
  maxChildren: number | null;
  maxParents: number | null;
  sectionsUnlocked: boolean;
  /** How many active children exceed the current tier's limit (0 if within it) — set when a
   * family actively downgrades to a lower paid tier while still under contract. Nothing is
   * ever removed automatically; the admin picks who to deactivate to get back under the limit. */
  childrenOverLimit: number;
}
