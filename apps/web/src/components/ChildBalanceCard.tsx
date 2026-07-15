import { motion } from 'framer-motion';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { formatMoney } from '../utils/currency.js';
import { useCurrency } from '../hooks/useTransactionActions.js';

interface ChildBalanceCardProps {
  child: ChildBalanceSummary;
  index: number;
  onDeposit: () => void;
  onWithdraw: () => void;
  onGiftStock: () => void;
}

export function ChildBalanceCard({ child, index, onDeposit, onWithdraw, onGiftStock }: ChildBalanceCardProps) {
  const currency = useCurrency();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
          {child.firstName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <span className="block font-medium">{child.firstName}</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {formatMoney(child.balanceCents, currency)}
          </span>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onGiftStock}
          aria-label={`Offrir des actions à ${child.firstName}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-900/70"
        >
          🎁
        </button>
        <button
          type="button"
          onClick={onDeposit}
          aria-label={`Ajouter de l'argent à ${child.firstName}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
        >
          +
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          aria-label={`Retirer de l'argent à ${child.firstName}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
        >
          −
        </button>
      </div>
    </motion.div>
  );
}
