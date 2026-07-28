import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useChildOverview } from '../hooks/useDashboard.js';
import { useMyRequests } from '../hooks/useMoneyRequests.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';
import { formatMoney } from '../utils/currency.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { RequestMoneyModal } from '../components/RequestMoneyModal.js';
import { useMyChores } from '../hooks/useChores.js';
import { ChoreList } from '../components/ChoreList.js';

/** 6-8 ans : une seule page, très peu de choix — un gros solde animé, un gros bouton
 * pour demander de l'argent, et les demandes reçues à accepter/refuser. Pas d'onglets,
 * pas d'actions boursières (trop complexe pour cet âge). */
export function ChildDashboardYoung() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const requests = useMyRequests();
  const chores = useMyChores();
  const { currency, rate } = useFxRate();
  const [requestOpen, setRequestOpen] = useState(false);

  const receivedPending = (requests.data ?? []).filter(
    (r) => r.status === 'PENDING' && r.targetUserId === user?.id,
  );

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-8 text-center">
      <p className="text-2xl font-bold">Salut {user?.firstName} ! 👋</p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex w-full flex-col items-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-lg"
      >
        <span className="text-6xl">🐷</span>
        <p className="mt-2 text-sm text-brand-100">Ta tirelire</p>
        <p className="mt-1 text-5xl font-extrabold">
          {overview.isLoading ? '…' : formatMoney(convertCents(overview.data?.balanceCents ?? 0, rate), currency)}
        </p>
      </motion.div>

      <button
        type="button"
        onClick={() => setRequestOpen(true)}
        className="w-full rounded-2xl bg-brand-600 py-5 text-xl font-bold text-white shadow-md hover:bg-brand-700"
      >
        💰 Demander de l'argent
      </button>

      {chores.data && chores.data.length > 0 && (
        <div className="w-full text-left">
          <h2 className="mb-2 text-lg font-semibold">Mes corvées</h2>
          <ChoreList chores={chores.data} emptyLabel="" />
        </div>
      )}

      {receivedPending.length > 0 && (
        <div className="w-full text-left">
          <h2 className="mb-2 text-lg font-semibold">On te demande quelque chose !</h2>
          {user && (
            <MoneyRequestList
              requests={receivedPending}
              viewerId={user.id}
              viewerRole="CHILD"
              emptyLabel=""
            />
          )}
        </div>
      )}

      {requestOpen && overview.data && (
        <RequestMoneyModal siblings={overview.data.siblings} onClose={() => setRequestOpen(false)} />
      )}
    </div>
  );
}
