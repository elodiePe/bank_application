import { useMutation, useQuery } from '@tanstack/react-query';
import type { CheckoutReturnPath, PaidSubscriptionTier } from '@banque-familiale/shared';
import { createCheckoutSession, createPortalSession, fetchSubscription } from '../services/billing.service.js';

export function useSubscription() {
  return useQuery({ queryKey: ['billing', 'subscription'], queryFn: fetchSubscription, staleTime: 30_000 });
}

/** Redirects the browser straight to the returned Stripe Checkout URL — nothing to reconcile
 * client-side, the subscription only actually changes once the webhook confirms it. */
export function useStartCheckout() {
  return useMutation({
    mutationFn: ({ tier, returnTo }: { tier: PaidSubscriptionTier; returnTo?: CheckoutReturnPath }) =>
      createCheckoutSession(tier, returnTo),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
