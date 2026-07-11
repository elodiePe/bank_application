import { motion } from 'framer-motion';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { formatChf } from '../utils/currency.js';

export function ChildBalanceCard({ child, index }: { child: ChildBalanceSummary; index: number }) {
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
        <span className="font-medium">{child.firstName}</span>
      </div>
      <span className="font-semibold">{formatChf(child.balanceCents)}</span>
    </motion.div>
  );
}
