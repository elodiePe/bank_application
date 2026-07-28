import { motion } from 'framer-motion';
import type { ChoreSummary } from '@banque-familiale/shared';
import { useCompleteChore } from '../hooks/useChores.js';
import { formatChoreReward } from '../utils/chore.js';
import { statusBackgroundClass } from '../utils/statusColors.js';

const STATUS_LABELS: Record<NonNullable<ChoreSummary['currentPeriodStatus']>, string> = {
  PENDING: 'Envoyé, en attente',
  APPROVED: 'Validé ✅',
  REJECTED: 'Refusé — réessaie',
};

function ChoreCard({ chore, index }: { chore: ChoreSummary; index: number }) {
  const completeChore = useCompleteChore();
  const canComplete = chore.currentPeriodStatus === null || chore.currentPeriodStatus === 'REJECTED';

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center justify-between rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700 ${statusBackgroundClass(chore.currentPeriodStatus ?? '')}`}
    >
      <div>
        <p className="font-medium">{chore.title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatChoreReward(chore)}</p>
      </div>
      {canComplete ? (
        <button
          type="button"
          onClick={() => completeChore.mutate(chore.id)}
          disabled={completeChore.isPending}
          className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Fait !
        </button>
      ) : (
        <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
          {STATUS_LABELS[chore.currentPeriodStatus!]}
        </span>
      )}
    </motion.li>
  );
}

export function ChoreList({ chores, emptyLabel }: { chores: ChoreSummary[]; emptyLabel: string }) {
  if (chores.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {chores.map((chore, index) => (
        <ChoreCard key={chore.id} chore={chore} index={index} />
      ))}
    </ul>
  );
}
