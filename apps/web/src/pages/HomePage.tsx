import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { DisputeSummary, TransactionSummary } from '@banque-familiale/shared';
import { useCurrentUser, usePermission } from '../hooks/useAuth.js';
import { useMyRequests, usePendingRequests } from '../hooks/useMoneyRequests.js';
import { useMyDisputes, usePendingDisputes, useResolveDispute } from '../hooks/useDisputes.js';
import { useApproveChoreCompletion, usePendingChoreCompletions, useRejectChoreCompletion } from '../hooks/useChores.js';
import { useChildOverview } from '../hooks/useDashboard.js';
import { useMealPlanUpcoming } from '../hooks/useMealPlan.js';
import { useShortcutOrder, type ShortcutKey } from '../hooks/useShortcutUsage.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { RequestMoneyModal } from '../components/RequestMoneyModal.js';
import { DisputeList } from '../components/DisputeList.js';
import { CorrectionModal } from '../components/CorrectionModal.js';
import { TypeBadge } from '../components/TypeBadge.js';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { DISPUTE_STATUS_LABELS } from '../utils/disputeLabels.js';
import { TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';
import { formatChoreReward } from '../utils/chore.js';
import { statusBackgroundClass } from '../utils/statusColors.js';

/** DisputeSummary carries a snapshot of the disputed transaction (type/amount/date), enough
 * to build a CorrectionModal-compatible TransactionSummary without a second fetch. */
function disputeToTransaction(d: DisputeSummary): TransactionSummary {
  return {
    id: d.transactionId,
    childUserId: '',
    childFirstName: d.raisedByFirstName,
    type: d.transactionType,
    status: 'COMPLETED',
    amountCents: d.transactionAmountCents,
    balanceBeforeCents: 0,
    balanceAfterCents: 0,
    comment: null,
    occurredAt: d.transactionOccurredAt,
    isReversible: true,
    senderFirstName: null,
    receiverFirstName: null,
    validatedByFirstName: null,
  };
}

const QUICK_LINKS = [
  { to: '/dashboard', icon: '💰', label: 'Argent' },
  { to: '/chores', icon: '🏠', label: 'Maison' },
  { to: '/settings', icon: '⚙️', label: 'Paramètres' },
];

function QuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {QUICK_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <span aria-hidden className="text-2xl">{link.icon}</span>
          <span className="text-sm font-medium">{link.label}</span>
        </Link>
      ))}
    </div>
  );
}

const SHORTCUT_META: Record<ShortcutKey, { to: string; icon: string; label: string }> = {
  chores: { to: '/chores', icon: '🧹', label: 'Corvées' },
  meals: { to: '/chores?tab=meals', icon: '🍽️', label: 'Repas' },
  shopping: { to: '/chores?tab=shopping', icon: '🛒', label: 'Courses' },
  stocks: { to: '/dashboard?tab=stocks', icon: '📈', label: 'Actions' },
};

/** The 4 feature shortcuts, ordered by how much this member actually uses each one (tracked
 * locally on this device) — the most-used lands first, so frequent destinations stay one tap
 * away instead of being buried behind whichever order they were coded in. */
function DynamicShortcuts({ userId }: { userId: string | undefined }) {
  const order = useShortcutOrder(userId);

  return (
    <section>
      {/* <h2 className="mb-3 text-lg font-semibold">Raccourcis</h2> */}
      <div className="grid grid-cols-4 gap-2">
        {order.map((key) => {
          const meta = SHORTCUT_META[key];
          return (
            <Link
              key={key}
              to={meta.to}
              className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <span aria-hidden className="text-xl">{meta.icon}</span>
              <span className="text-xs font-medium">{meta.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Front-and-center banner shown only to whoever is assigned to cook today — easy to miss
 * buried in the meal-plan list, so it also gets a callout on Accueil itself. */
function CookingTurnBanner({ userId }: { userId: string | undefined }) {
  const upcoming = useMealPlanUpcoming(1);
  const today = upcoming.data?.[0];
  if (!userId || !today || today.assignedUserId !== userId) return null;

  return (
    <Link
      to="/chores?tab=meals"
      className="block rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-4 text-white shadow-md hover:opacity-95"
    >
      <p className="font-semibold">🍳 C'est à toi de faire à manger aujourd'hui !</p>
      <p className="text-sm text-orange-100">Voir le planning des repas →</p>
    </Link>
  );
}

/** "Accueil" section: quick links to the other sections, plus everything that used to live on
 * the old "Demandes" tab (money requests, chore validation, and disputes). */
export function HomePage() {
  const { data: user } = useCurrentUser();
  // The YOUNG tier has no navigation of its own — everything lives on the single
  // ChildDashboardYoung page instead.
  if (user?.interfaceLevel === 'YOUNG') return <Navigate to="/dashboard" replace />;
  return user?.role === 'PARENT' ? <ParentHomePage /> : <ChildHomePage />;
}

function ParentHomePage() {
  const { data: user } = useCurrentUser();
  const pendingRequests = usePendingRequests();
  const pendingDisputes = usePendingDisputes();
  const resolveDispute = useResolveDispute();
  const pendingChoreCompletions = usePendingChoreCompletions();
  const approveChoreCompletion = useApproveChoreCompletion();
  const rejectChoreCompletion = useRejectChoreCompletion();
  const canManageActions = usePermission('canManageActions');
  const [disputeCorrection, setDisputeCorrection] = useState<DisputeSummary | null>(null);

  const nothingPending =
    pendingRequests.data?.length === 0 &&
    pendingChoreCompletions.data?.length === 0 &&
    pendingDisputes.data?.length === 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Bonjour {user?.firstName} 👋</h1>

      <CookingTurnBanner userId={user?.id} />

      <QuickLinks />

      <DynamicShortcuts userId={user?.id} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Demandes en attente</h2>
        {(pendingRequests.isLoading || pendingChoreCompletions.isLoading || pendingDisputes.isLoading) && (
          <p className="text-slate-500 dark:text-slate-400">Chargement…</p>
        )}
        {(pendingRequests.isError || pendingChoreCompletions.isError || pendingDisputes.isError) && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger les demandes.</p>
        )}
        {nothingPending && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune demande en attente.
          </p>
        )}
        {pendingRequests.data && pendingRequests.data.length > 0 && user && (
          <MoneyRequestList
            requests={pendingRequests.data}
            viewerId={user.id}
            viewerRole="PARENT"
            emptyLabel="Aucune demande en attente."
          />
        )}
        {pendingChoreCompletions.data && pendingChoreCompletions.data.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3">
            {pendingChoreCompletions.data.map((completion) => (
              <li
                key={completion.id}
                className={`flex items-center justify-between rounded-2xl border border-slate-200/70 p-4 shadow-sm dark:border-slate-700/70 ${statusBackgroundClass(completion.status)}`}
              >
                <div>
                  <TypeBadge>Corvée</TypeBadge>
                  <p className="font-medium">
                    {completion.childFirstName} · {completion.choreTitle}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatChoreReward(completion)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => approveChoreCompletion.mutate(completion.id)}
                    disabled={approveChoreCompletion.isPending || rejectChoreCompletion.isPending}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectChoreCompletion.mutate(completion.id)}
                    disabled={approveChoreCompletion.isPending || rejectChoreCompletion.isPending}
                    className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
                  >
                    Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {pendingDisputes.data && pendingDisputes.data.length > 0 && (
          <div className="mt-3">
            <DisputeList
              disputes={pendingDisputes.data}
              emptyLabel="Aucune erreur signalée."
              onCorrect={setDisputeCorrection}
              canAct={canManageActions}
            />
          </div>
        )}
      </section>

      {disputeCorrection && (
        <CorrectionModal
          transaction={disputeToTransaction(disputeCorrection)}
          onClose={() => setDisputeCorrection(null)}
          onCorrected={() => resolveDispute.mutate(disputeCorrection.id)}
        />
      )}
    </div>
  );
}

function ChildHomePage() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const requests = useMyRequests();
  const disputes = useMyDisputes();
  const [requestOpen, setRequestOpen] = useState(false);
  const [dismissedDisputeIds, setDismissedDisputeIds] = useState<Set<string>>(new Set());

  const receivedPending = (requests.data ?? []).filter(
    (r) => r.status === 'PENDING' && r.targetUserId === user?.id,
  );
  const mine = (requests.data ?? []).filter((r) => r.requesterId === user?.id);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Bonjour {user?.firstName} 👋</h1>

      <CookingTurnBanner userId={user?.id} />

      <QuickLinks />

      <DynamicShortcuts userId={user?.id} />

      {receivedPending.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Demandes reçues</h2>
          {user && (
            <MoneyRequestList
              requests={receivedPending}
              viewerId={user.id}
              viewerRole="CHILD"
              emptyLabel="Aucune demande reçue."
            />
          )}
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes demandes</h2>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Faire une demande
          </button>
        </div>
        {user && (
          <MoneyRequestList
            requests={mine}
            viewerId={user.id}
            viewerRole="CHILD"
            emptyLabel="Aucune demande envoyée."
          />
        )}
        {(() => {
          const visibleDisputes = (disputes.data ?? []).filter((d) => !dismissedDisputeIds.has(d.id));
          if (visibleDisputes.length === 0) return null;
          return (
            <ul className="mt-3 flex flex-col gap-2">
              {visibleDisputes.map((d) => {
                const canDismiss = d.status !== 'PENDING';
                return (
                  <li
                    key={d.id}
                    className={`relative rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700 ${statusBackgroundClass(d.status)}`}
                  >
                    <div className={canDismiss ? 'pr-6' : undefined}>
                      <TypeBadge>Signalement</TypeBadge>
                      <p className="font-medium">
                        {TRANSACTION_TYPE_LABELS[d.transactionType]} · {formatMoney(d.transactionAmountCents, STORAGE_CURRENCY)}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {d.reason} · {DISPUTE_STATUS_LABELS[d.status]}
                      </p>
                    </div>
                    {canDismiss && (
                      <button
                        type="button"
                        onClick={() => setDismissedDisputeIds((prev) => new Set(prev).add(d.id))}
                        aria-label="Masquer ce signalement"
                        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden>
                          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </section>

      {requestOpen && overview.data && (
        <RequestMoneyModal siblings={overview.data.siblings} onClose={() => setRequestOpen(false)} />
      )}
    </div>
  );
}
