import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ChildBalanceSummary, DisputeSummary, TransactionSummary } from '@banque-familiale/shared';
import { useCurrentUser, usePermission } from '../hooks/useAuth.js';
import { useParentOverview, useRecentTransactions } from '../hooks/useDashboard.js';
import { usePendingRequests } from '../hooks/useMoneyRequests.js';
import { usePendingDisputes, useResolveDispute } from '../hooks/useDisputes.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';
import { formatMoney } from '../utils/currency.js';
import { ChildBalanceCard } from '../components/ChildBalanceCard.js';
import { ChildPortfolioSummary } from '../components/ChildPortfolioSummary.js';
import { TimelineCard } from '../components/TimelineCard.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { DisputeList } from '../components/DisputeList.js';
import { MoneyActionModal } from '../components/MoneyActionModal.js';
import { TransferModal } from '../components/TransferModal.js';
import { CorrectionModal } from '../components/CorrectionModal.js';
import { PendingStockOrdersList } from '../components/PendingStockOrdersList.js';
import { SwipeTabs } from '../components/SwipeTabs.js';

type MoneyAction = { mode: 'DEPOSIT' | 'WITHDRAWAL'; child: ChildBalanceSummary };

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

export function ParentDashboardPage() {
  const { data: user } = useCurrentUser();
  const overview = useParentOverview();
  const recentTransactions = useRecentTransactions(7);
  const pendingRequests = usePendingRequests();
  const pendingDisputes = usePendingDisputes();
  const resolveDispute = useResolveDispute();
  const { currency, rate } = useFxRate();
  const canManageMoney = usePermission('canManageMoney');
  const canManageActions = usePermission('canManageActions');

  const [moneyAction, setMoneyAction] = useState<MoneyAction | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<TransactionSummary | null>(null);
  const [disputeCorrection, setDisputeCorrection] = useState<DisputeSummary | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const hasAutoSelected = useRef(false);

  const pendingCount = (pendingRequests.data?.length ?? 0) + (pendingDisputes.data?.length ?? 0);

  useEffect(() => {
    if (hasAutoSelected.current || !pendingRequests.data || !pendingDisputes.data) return;
    hasAutoSelected.current = true;
    if (pendingCount > 0) setActiveTab(1);
  }, [pendingRequests.data, pendingDisputes.data, pendingCount]);

  const moneyTab = (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white shadow-md"
      >
        <p className="text-sm text-brand-100">Solde total de la famille</p>
        <p className="mt-1 text-3xl font-bold">
          {overview.isLoading
            ? '…'
            : formatMoney(convertCents(overview.data?.totalBalanceCents ?? 0, rate), currency)}
        </p>
      </motion.div>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comptes des enfants</h2>
          {canManageMoney && overview.data && overview.data.children.length >= 2 && (
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              className="text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Virement entre enfants
            </button>
          )}
        </div>
        {overview.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {overview.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger les soldes.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {overview.data?.children.map((child, index) => (
            <ChildBalanceCard
              key={child.accountId}
              child={child}
              index={index}
              onDeposit={canManageMoney ? () => setMoneyAction({ mode: 'DEPOSIT', child }) : undefined}
              onWithdraw={canManageMoney ? () => setMoneyAction({ mode: 'WITHDRAWAL', child }) : undefined}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historique récent</h2>
          <Link to="/history" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Voir tout l'historique →
          </Link>
        </div>
        {recentTransactions.isLoading && (
          <p className="text-slate-500 dark:text-slate-400">Chargement…</p>
        )}
        {recentTransactions.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>
        )}
        {recentTransactions.data && recentTransactions.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune opération pour le moment.
          </p>
        )}
        {recentTransactions.data && recentTransactions.data.length > 0 && (
          <div className="flex flex-col gap-3">
            {recentTransactions.data.map((t, index) => (
              <TimelineCard
                key={t.id}
                transaction={t}
                index={index}
                showChildName
                onCorrect={canManageMoney ? setCorrectionTarget : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const actionsTab = (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Portefeuilles des enfants</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {overview.data?.children.map((child, index) => (
            <ChildPortfolioSummary
              key={child.accountId}
              child={child}
              index={index}
              canOffer={canManageActions}
            />
          ))}
        </div>
      </section>

      <PendingStockOrdersList canAct={canManageActions} />
    </div>
  );

  const requestsTab = (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Demandes en attente</h2>
        {pendingRequests.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {pendingRequests.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger les demandes.</p>
        )}
        {pendingRequests.data && user && (
          <MoneyRequestList
            requests={pendingRequests.data}
            viewerId={user.id}
            viewerRole="PARENT"
            emptyLabel="Aucune demande en attente."
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Erreurs signalées</h2>
        {pendingDisputes.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {pendingDisputes.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger les signalements.</p>
        )}
        {pendingDisputes.data && (
          <DisputeList
            disputes={pendingDisputes.data}
            emptyLabel="Aucune erreur signalée."
            onCorrect={setDisputeCorrection}
            canAct={canManageActions}
          />
        )}
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

      {moneyAction && (
        <MoneyActionModal
          mode={moneyAction.mode}
          accountId={moneyAction.child.accountId}
          childFirstName={moneyAction.child.firstName}
          onClose={() => setMoneyAction(null)}
        />
      )}
      {transferOpen && overview.data && (
        <TransferModal children={overview.data.children} onClose={() => setTransferOpen(false)} />
      )}
      {correctionTarget && (
        <CorrectionModal transaction={correctionTarget} onClose={() => setCorrectionTarget(null)} />
      )}
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
