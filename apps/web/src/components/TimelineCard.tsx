import { motion } from 'framer-motion';
import type { TransactionSummary } from '@banque-familiale/shared';
import { formatMoney } from '../utils/currency.js';
import { useCurrency } from '../hooks/useTransactionActions.js';
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_TYPE_LABELS,
  transactionSign,
} from '../utils/transactionLabels.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  REVERSED: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface TimelineCardProps {
  transaction: TransactionSummary;
  index: number;
  showChildName?: boolean;
  onCorrect?: (transaction: TransactionSummary) => void;
}

export function TimelineCard({ transaction: t, index, showChildName, onCorrect }: TimelineCardProps) {
  const sign = transactionSign(t);
  const currency = useCurrency();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.03 }}
      whileHover={{ scale: 1.01 }}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-800">
        {TRANSACTION_TYPE_ICONS[t.type]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {showChildName ? `${t.childFirstName} · ` : ''}
          {TRANSACTION_TYPE_LABELS[t.type]}
        </p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          {t.comment ?? '—'}
          {t.senderFirstName && t.receiverFirstName ? ` · ${t.senderFirstName} → ${t.receiverFirstName}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {formatDate(t.occurredAt)} à {formatTime(t.occurredAt)}
          {t.validatedByFirstName ? ` · validé par ${t.validatedByFirstName}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={
            sign > 0
              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
              : sign < 0
                ? 'font-semibold text-red-600 dark:text-red-400'
                : 'font-semibold text-slate-600 dark:text-slate-400'
          }
        >
          {sign > 0 ? '+' : sign < 0 ? '−' : ''}
          {formatMoney(t.amountCents, currency)}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Solde : {formatMoney(t.balanceAfterCents, currency)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[t.status]}`}>
          {TRANSACTION_STATUS_LABELS[t.status]}
        </span>
        {onCorrect && t.isReversible && (
          <button
            type="button"
            onClick={() => onCorrect(t)}
            className="text-xs text-slate-400 hover:text-brand-600 hover:underline dark:hover:text-brand-400"
          >
            Corriger
          </button>
        )}
      </div>
    </motion.div>
  );
}
