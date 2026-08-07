import type { CheckoutReturnPath, PaidSubscriptionTier, SubscriptionSummary } from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function fetchSubscription(): Promise<SubscriptionSummary> {
  return apiGet<SubscriptionSummary>('/billing/subscription');
}

/** Returns a Stripe Checkout URL — the caller redirects the browser there directly (Stripe's
 * own hosted page, card details never pass through our frontend). `returnTo` controls where
 * Stripe sends the browser back after payment (defaults to /settings server-side). */
export function createCheckoutSession(tier: PaidSubscriptionTier, returnTo?: CheckoutReturnPath): Promise<{ url: string }> {
  return apiPost<{ url: string }>('/billing/checkout-session', { tier, returnTo });
}

/** Returns a Stripe customer-portal URL for managing/canceling the current subscription. */
export function createPortalSession(): Promise<{ url: string }> {
  return apiPost<{ url: string }>('/billing/portal-session');
}
