import { motion } from 'framer-motion';
import { useParentOverview, useRecentTransactions } from '../hooks/useDashboard.js';
import { formatChf } from '../utils/currency.js';
import { ChildBalanceCard } from '../components/ChildBalanceCard.js';
import { RecentTransactionsList } from '../components/RecentTransactionsList.js';

export function ParentDashboardPage() {
  const overview = useParentOverview();
  const recentTransactions = useRecentTransactions();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-brand-600 p-6 text-white shadow-md"
      >
        <p className="text-sm text-brand-100">Solde total de la famille</p>
        <p className="mt-1 text-3xl font-bold">
          {overview.isLoading ? '…' : formatChf(overview.data?.totalBalanceCents ?? 0)}
        </p>
        {overview.data && overview.data.pendingRequestsCount > 0 && (
          <p className="mt-3 text-sm text-brand-100">
            {overview.data.pendingRequestsCount} demande(s) en attente
          </p>
        )}
      </motion.div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Comptes des enfants</h2>
        {overview.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {overview.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger les soldes.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {overview.data?.children.map((child, index) => (
            <ChildBalanceCard key={child.accountId} child={child} index={index} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Demandes en attente</h2>
        {overview.data?.pendingRequestsCount === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune demande en attente.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Historique récent</h2>
        {recentTransactions.isLoading && (
          <p className="text-slate-500 dark:text-slate-400">Chargement…</p>
        )}
        {recentTransactions.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>
        )}
        {recentTransactions.data && (
          <RecentTransactionsList transactions={recentTransactions.data} />
        )}
      </section>
    </div>
  );
}
