import { motion } from 'framer-motion';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { formatMoney } from '../utils/currency.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';

interface ChildBalanceCardProps {
  child: ChildBalanceSummary;
  index: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

export function ChildBalanceCard({ child, index, onDeposit, onWithdraw }: ChildBalanceCardProps) {
  const { currency, rate, rateLoading } = useFxRate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-800"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold text-white">
          {child.firstName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <span className="block font-medium">{child.firstName}</span>
          <span className="block text-lg font-semibold text-slate-700 dark:text-slate-300">
            {rateLoading ? '…' : formatMoney(convertCents(child.balanceCents, rate), currency)}
          </span>
          {/* {child.pointsBalance > 0 && (
            <span className="block text-xs text-amber-600 dark:text-amber-400">⭐ {child.pointsBalance} points</span>
          )} */}
        </div>
      </div>
      {(onDeposit || onWithdraw) && (
        <div className="flex gap-1">
          {onDeposit && (
            <button
              type="button"
              onClick={onDeposit}
              aria-label={`Ajouter de l'argent à ${child.firstName}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
            >
              +
            </button>
          )}
          {onWithdraw && (
            <button
              type="button"
              onClick={onWithdraw}
              aria-label={`Retirer de l'argent à ${child.firstName}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
            >
              −
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
