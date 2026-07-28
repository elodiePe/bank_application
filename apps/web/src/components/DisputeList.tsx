import { motion } from 'framer-motion';
import type { DisputeSummary } from '@banque-familiale/shared';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';
import { useDismissDispute } from '../hooks/useDisputes.js';
import { statusBackgroundClass } from '../utils/statusColors.js';
import { TypeBadge } from './TypeBadge.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface DisputeListProps {
  disputes: DisputeSummary[];
  emptyLabel: string;
  onCorrect: (dispute: DisputeSummary) => void;
  canAct?: boolean;
}

export function DisputeList({ disputes, emptyLabel, onCorrect, canAct = true }: DisputeListProps) {
  const dismiss = useDismissDispute();

  if (disputes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {disputes.map((d, index) => (
        <motion.li
          key={d.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className={`flex items-center justify-between rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700 ${statusBackgroundClass(d.status)}`}
        >
          <div>
            <TypeBadge>Signalement</TypeBadge>
            <p className="font-medium">
              {d.raisedByFirstName} · {TRANSACTION_TYPE_LABELS[d.transactionType]} ·{' '}
              {formatMoney(d.transactionAmountCents, STORAGE_CURRENCY)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              « {d.reason} » · {formatDate(d.createdAt)}
            </p>
          </div>
          {canAct && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onCorrect(d)}
                className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-900/70"
              >
                Corriger
              </button>
              <button
                type="button"
                onClick={() => dismiss.mutate(d.id)}
                disabled={dismiss.isPending}
                className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
              >
                Rejeter
              </button>
            </div>
          )}
        </motion.li>
      ))}
    </ul>
  );
}
