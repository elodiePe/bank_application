import {
  SUBSCRIPTION_TIER_ANNUAL_CHF,
  SUBSCRIPTION_TIER_LABELS,
  SUBSCRIPTION_TIER_MONTHLY_CHF,
  type PaidSubscriptionTier,
} from '@banque-familiale/shared';
import { useOpenBillingPortal, useStartCheckout, useSubscription } from '../hooks/useBilling.js';
import { ApiError } from '../services/api.js';

const UPGRADE_TIERS: PaidSubscriptionTier[] = ['FAMILLE', 'GRANDE_FAMILLE'];

/** Lets a parent see the family's current plan and either subscribe (redirect to Stripe
 * Checkout) or manage an existing subscription (redirect to the Stripe customer portal) —
 * neither ever touches card details directly, both are Stripe's own hosted pages. */
export function SubscriptionSettings() {
  const subscription = useSubscription();
  const startCheckout = useStartCheckout();
  const openPortal = useOpenBillingPortal();

  if (!subscription.data) return null;

  const { tier, maxChildren, sectionsUnlocked } = subscription.data;
  const isPaid = tier !== 'ESSENTIEL';
  const anyPending = startCheckout.isPending || openPortal.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm font-medium">Plan actuel : {SUBSCRIPTION_TIER_LABELS[tier]}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {maxChildren === null ? 'Enfants illimités' : `Jusqu'à ${maxChildren} enfant${maxChildren > 1 ? 's' : ''}`}
          {' · '}
          {sectionsUnlocked ? 'Toutes les sections activées' : 'Argent de poche et corvées uniquement'}
        </p>

        {isPaid && (
          <button
            type="button"
            onClick={() => openPortal.mutate()}
            disabled={anyPending}
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            {openPortal.isPending ? 'Ouverture…' : 'Gérer mon abonnement'}
          </button>
        )}
      </div>

      {!isPaid &&
        UPGRADE_TIERS.map((upgradeTier) => (
          <div
            key={upgradeTier}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div>
              <p className="text-sm font-medium">{SUBSCRIPTION_TIER_LABELS[upgradeTier]}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {SUBSCRIPTION_TIER_MONTHLY_CHF[upgradeTier]} CHF / mois — facturé{' '}
                {SUBSCRIPTION_TIER_ANNUAL_CHF[upgradeTier]} CHF une fois par an
              </p>
            </div>
            <button
              type="button"
              onClick={() => startCheckout.mutate({ tier: upgradeTier })}
              disabled={anyPending}
              className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {startCheckout.isPending ? 'Redirection…' : 'Choisir'}
            </button>
          </div>
        ))}

      {(startCheckout.isError || openPortal.isError) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {(startCheckout.error instanceof ApiError && startCheckout.error.code === 'EXTERNAL_SERVICE_ERROR') ||
          (openPortal.error instanceof ApiError && openPortal.error.code === 'EXTERNAL_SERVICE_ERROR')
            ? "La facturation n'est pas encore configurée. Réessaie plus tard."
            : 'Une erreur est survenue.'}
        </p>
      )}
    </div>
  );
}
