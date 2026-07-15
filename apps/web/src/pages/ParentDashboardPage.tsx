import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ChildBalanceSummary, TransactionSummary } from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useParentOverview, useRecentTransactions } from '../hooks/useDashboard.js';
import { usePendingRequests } from '../hooks/useMoneyRequests.js';
import { useCurrency } from '../hooks/useTransactionActions.js';
import { formatMoney } from '../utils/currency.js';
import { ChildBalanceCard } from '../components/ChildBalanceCard.js';
import { RecentTransactionsList } from '../components/RecentTransactionsList.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { MoneyActionModal } from '../components/MoneyActionModal.js';
import { TransferModal } from '../components/TransferModal.js';
import { CorrectionModal } from '../components/CorrectionModal.js';
import { PendingStockOrdersList } from '../components/PendingStockOrdersList.js';
import { GiftStockModal } from '../components/GiftStockModal.js';

type MoneyAction = { mode: 'DEPOSIT' | 'WITHDRAWAL'; child: ChildBalanceSummary };

export function ParentDashboardPage() {
  const { data: user } = useCurrentUser();
  const overview = useParentOverview();
  const recentTransactions = useRecentTransactions();
  const pendingRequests = usePendingRequests();
  const currency = useCurrency();

  const [moneyAction, setMoneyAction] = useState<MoneyAction | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<TransactionSummary | null>(null);
  const [giftTarget, setGiftTarget] = useState<ChildBalanceSummary | null>(null);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-brand-600 p-6 text-white shadow-md"
      >
        <p className="text-sm text-brand-100">Solde total de la famille</p>
        <p className="mt-1 text-3xl font-bold">
          {overview.isLoading ? '…' : formatMoney(overview.data?.totalBalanceCents ?? 0, currency)}
        </p>
        {overview.data && overview.data.pendingRequestsCount > 0 && (
          <p className="mt-3 text-sm text-brand-100">
            {overview.data.pendingRequestsCount} demande(s) en attente
          </p>
        )}
      </motion.div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comptes des enfants</h2>
          {overview.data && overview.data.children.length >= 2 && (
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
              onDeposit={() => setMoneyAction({ mode: 'DEPOSIT', child })}
              onWithdraw={() => setMoneyAction({ mode: 'WITHDRAWAL', child })}
              onGiftStock={() => setGiftTarget(child)}
            />
          ))}
        </div>
      </section>

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

      <PendingStockOrdersList />

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
        {recentTransactions.data && (
          <RecentTransactionsList
            transactions={recentTransactions.data}
            onCorrect={setCorrectionTarget}
          />
        )}
      </section>

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
      {giftTarget && (
        <GiftStockModal
          accountId={giftTarget.accountId}
          childFirstName={giftTarget.firstName}
          onClose={() => setGiftTarget(null)}
        />
      )}
    </div>
  );
}
