import { motion } from 'framer-motion';
import type { TransactionSummary } from '@banque-familiale/shared';
import { formatChf } from '../utils/currency.js';
import { TRANSACTION_TYPE_LABELS, transactionSign } from '../utils/transactionLabels.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function RecentTransactionsList({ transactions }: { transactions: TransactionSummary[] }) {
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
        const sign = transactionSign(t.type);
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
              {formatChf(t.amountCents)}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
