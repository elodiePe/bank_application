import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { TransactionSummary } from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useChildOverview, useMyTransactions } from '../hooks/useDashboard.js';
import { useMyRequests } from '../hooks/useMoneyRequests.js';
import { useMyDisputes } from '../hooks/useDisputes.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { TimelineCard } from '../components/TimelineCard.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { RequestMoneyModal } from '../components/RequestMoneyModal.js';
import { DisputeModal } from '../components/DisputeModal.js';
import { StockPortfolioView } from '../components/StockPortfolioView.js';
import { SwipeTabs } from '../components/SwipeTabs.js';
import { DISPUTE_STATUS_LABELS } from '../utils/disputeLabels.js';
import { TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';

export function ChildDashboardPage() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const transactions = useMyTransactions(7);
  const requests = useMyRequests();
  const disputes = useMyDisputes();
  const { currency, rate } = useFxRate();
  const [requestOpen, setRequestOpen] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState<TransactionSummary | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const hasAutoSelected = useRef(false);
  const [dismissedDisputeIds, setDismissedDisputeIds] = useState<Set<string>>(new Set());

  const receivedPending = (requests.data ?? []).filter(
    (r) => r.status === 'PENDING' && r.targetUserId === user?.id,
  );
  const mine = (requests.data ?? []).filter((r) => r.requesterId === user?.id);
  const pendingDisputes = (disputes.data ?? []).filter((d) => d.status === 'PENDING');
  const pendingCount =
    receivedPending.length + mine.filter((r) => r.status === 'PENDING').length + pendingDisputes.length;

  useEffect(() => {
    if (hasAutoSelected.current || !requests.data || !disputes.data) return;
    hasAutoSelected.current = true;
    if (pendingCount > 0) setActiveTab(1);
  }, [requests.data, disputes.data, pendingCount]);

  const moneyTab = (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white shadow-md"
      >
        <p className="text-sm text-brand-100">Bonjour {user?.firstName} 👋</p>
        <p className="mt-1 text-3xl font-bold">
          {overview.isLoading
            ? '…'
            : formatMoney(convertCents(overview.data?.balanceCents ?? 0, rate), currency)}
        </p>
        {overview.data && overview.data.weeklyAllowanceCents > 0 && (
          <p className="mt-3 text-sm text-brand-100">
            Argent de poche : {formatMoney(overview.data.weeklyAllowanceCents, STORAGE_CURRENCY)} / semaine
          </p>
        )}
      </motion.div>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes transactions</h2>
          <Link to="/history" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Voir l'historique →
          </Link>
        </div>
        {transactions.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {transactions.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>
        )}
        {transactions.data && transactions.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune opération pour le moment.
          </p>
        )}
        {transactions.data && transactions.data.length > 0 && (
          <div className="flex flex-col gap-3">
            {transactions.data.map((t, index) => (
              <TimelineCard key={t.id} transaction={t} index={index} onDispute={setDisputeTarget} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const actionsTab = <StockPortfolioView />;

  const requestsTab = (
    <div className="space-y-8">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes demandes</h2>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Faire une demande
          </button>
        </div>
        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
          Pour acheter ou vendre des actions, c'est dans l'onglet{' '}
          <button
            type="button"
            onClick={() => setActiveTab(2)}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Actions
          </button>
          .
        </p>
        {user && (
          <MoneyRequestList
            requests={mine}
            viewerId={user.id}
            viewerRole="CHILD"
            emptyLabel="Aucune demande envoyée."
          />
        )}
      </section>

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

      <section>
        <h2 className="mb-3 text-lg font-semibold">Mes signalements</h2>
        {(() => {
          const visibleDisputes = (disputes.data ?? []).filter((d) => !dismissedDisputeIds.has(d.id));
          return visibleDisputes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Aucune erreur signalée.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleDisputes.map((d) => {
                const canDismiss = d.status !== 'PENDING';
                return (
                  <li
                    key={d.id}
                    className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className={canDismiss ? 'pr-6' : undefined}>
                      <p className="font-medium">
                        {TRANSACTION_TYPE_LABELS[d.transactionType]} ·{' '}
                        {formatMoney(d.transactionAmountCents, STORAGE_CURRENCY)}
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
    </div>
  );

  return (
    <div>
      <SwipeTabs
        active={activeTab}
        onActiveChange={setActiveTab}
        tabs={[
          { label: 'Argent', content: moneyTab },
          { label: 'Demandes', content: requestsTab, badge: pendingCount },
          { label: 'Actions', content: actionsTab },
        ]}
      />

      {requestOpen && overview.data && (
        <RequestMoneyModal siblings={overview.data.siblings} onClose={() => setRequestOpen(false)} />
      )}
      {disputeTarget && (
        <DisputeModal transaction={disputeTarget} onClose={() => setDisputeTarget(null)} />
      )}
    </div>
  );
}
