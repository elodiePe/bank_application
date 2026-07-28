import { motion } from 'framer-motion';
import type { TransactionSummary } from '@banque-familiale/shared';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { TRANSACTION_TYPE_BG_CLASSES, TRANSACTION_TYPE_LABELS, transactionSign } from '../utils/transactionLabels.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M4 3v14M4 4h9l-2 3 2 3H4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TimelineCardProps {
  transaction: TransactionSummary;
  index: number;
  showChildName?: boolean;
  onCorrect?: (transaction: TransactionSummary) => void;
  onDispute?: (transaction: TransactionSummary) => void;
}

export function TimelineCard({ transaction: t, index, showChildName, onCorrect, onDispute }: TimelineCardProps) {
  const sign = transactionSign(t);
  const meta = [
    `${formatDate(t.occurredAt)} à ${formatTime(t.occurredAt)}`,
    t.validatedByFirstName ? `validé par ${t.validatedByFirstName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.03 }}
      whileHover={{ scale: 1.01 }}
      className={`rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-700 ${TRANSACTION_TYPE_BG_CLASSES[t.type]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-medium">
          {showChildName ? `${t.childFirstName} · ` : ''}
          {TRANSACTION_TYPE_LABELS[t.type]}
        </p>
        <span
          className={`shrink-0 font-semibold ${
            sign > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : sign < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {sign > 0 ? '+' : sign < 0 ? '−' : ''}
          {formatMoney(t.amountCents, STORAGE_CURRENCY)}
        </span>
      </div>

      <div className="mt-0.5 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">
          {t.comment ?? '—'}
          {t.senderFirstName && t.receiverFirstName ? ` · ${t.senderFirstName} → ${t.receiverFirstName}` : ''}
        </p>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          Solde : {formatMoney(t.balanceAfterCents, STORAGE_CURRENCY)}
        </span>
      </div>

      {(meta || onCorrect || onDispute) && (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-black/5 pt-2 dark:border-white/5">
          <p className="min-w-0 truncate text-xs text-slate-400 dark:text-slate-500">{meta}</p>
          <div className="flex shrink-0 items-center gap-3">
            {onCorrect && t.isReversible && (
              <button
                type="button"
                onClick={() => onCorrect(t)}
                className="text-xs text-slate-400 hover:text-brand-600 hover:underline dark:hover:text-brand-400"
              >
                Corriger
              </button>
            )}
            {onDispute && t.isReversible && (
              <button
                type="button"
                onClick={() => onDispute(t)}
                aria-label="Signaler cette opération"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 hover:underline dark:hover:text-red-400"
              >
                <FlagIcon />
                Signaler
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
