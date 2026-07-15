import { motion } from 'framer-motion';
import type { TransactionSummary } from '@banque-familiale/shared';
import { formatMoney } from '../utils/currency.js';
import { TRANSACTION_TYPE_LABELS, transactionSign } from '../utils/transactionLabels.js';
import { useCurrency } from '../hooks/useTransactionActions.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface RecentTransactionsListProps {
  transactions: TransactionSummary[];
  onCorrect?: (transaction: TransactionSummary) => void;
}

export function RecentTransactionsList({ transactions, onCorrect }: RecentTransactionsListProps) {
  const currency = useCurrency();
  if (transactions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Aucune opération pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((t, index) => {
        const sign = transactionSign(t);
        return (
          <motion.li
            key={t.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="font-medium">
                {t.childFirstName} · {TRANSACTION_TYPE_LABELS[t.type]}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.comment ?? '—'} · {formatDate(t.occurredAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
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
          </motion.li>
        );
      })}
    </ul>
  );
}
