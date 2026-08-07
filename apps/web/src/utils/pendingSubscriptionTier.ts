/** Carries the plan chosen on RegisterFamilyPage across the /register → /login navigation, so
 * LoginPage's "create first parent" step (the earliest point a member access-token exists,
 * which billing endpoints require) can redirect straight to Stripe Checkout for a paid choice. */
export const PENDING_SUBSCRIPTION_TIER_KEY = 'pendingSubscriptionTier';
