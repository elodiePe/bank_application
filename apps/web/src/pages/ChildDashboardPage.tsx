import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useChildOverview, useMyTransactions } from '../hooks/useDashboard.js';
import { useMyRequests } from '../hooks/useMoneyRequests.js';
import { useCurrency } from '../hooks/useTransactionActions.js';
import { formatMoney } from '../utils/currency.js';
import { RecentTransactionsList } from '../components/RecentTransactionsList.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { RequestMoneyModal } from '../components/RequestMoneyModal.js';
import { PortfolioTeaser } from '../components/PortfolioTeaser.js';

export function ChildDashboardPage() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const transactions = useMyTransactions();
  const requests = useMyRequests();
  const currency = useCurrency();
  const [requestOpen, setRequestOpen] = useState(false);

  const receivedPending = (requests.data ?? []).filter(
    (r) => r.status === 'PENDING' && r.targetUserId === user?.id,
  );
  const mine = (requests.data ?? []).filter((r) => r.requesterId === user?.id);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-brand-600 p-6 text-white shadow-md"
      >
        <p className="text-sm text-brand-100">Bonjour {user?.firstName} 👋</p>
        <p className="mt-1 text-3xl font-bold">
          {overview.isLoading ? '…' : formatMoney(overview.data?.balanceCents ?? 0, currency)}
        </p>
        {overview.data && overview.data.weeklyAllowanceCents > 0 && (
          <p className="mt-3 text-sm text-brand-100">
            Argent de poche : {formatMoney(overview.data.weeklyAllowanceCents, currency)} / semaine
          </p>
        )}
      </motion.div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes demandes</h2>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            Demander de l'argent
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
      </section>

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

      <PortfolioTeaser />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mon historique</h2>
          <Link to="/history" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Voir tout l'historique →
          </Link>
        </div>
        {transactions.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {transactions.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>
        )}
        {transactions.data && <RecentTransactionsList transactions={transactions.data} />}
      </section>

      {requestOpen && overview.data && (
        <RequestMoneyModal siblings={overview.data.siblings} onClose={() => setRequestOpen(false)} />
      )}
    </div>
  );
}
