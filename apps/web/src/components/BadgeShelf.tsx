import { motion } from 'framer-motion';
import type { BadgeDef } from '../hooks/useBadges.js';

/** Horizontal row of achievement badges — unlocked ones are bright and bounce in, locked ones
 * sit greyed-out with a lock so the child can see what's still ahead (the description shows
 * on tap/hover via the native title tooltip, same pattern as icon-only buttons elsewhere). */
export function BadgeShelf({ badges }: { badges: (BadgeDef & { unlocked: boolean })[] }) {
  return (
    <div className="w-full text-left">
      <h2 className="mb-2 text-lg font-semibold">🏅 Mes badges</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04 }}
            title={badge.unlocked ? `${badge.label} — ${badge.description}` : `? — ${badge.description}`}
            className={
              badge.unlocked
                ? 'flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl border-2 border-amber-300 bg-amber-50 p-2 shadow-sm dark:border-amber-500 dark:bg-amber-900/30'
                : 'flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2 opacity-60 dark:border-slate-700 dark:bg-slate-800'
            }
          >
            <span className="text-3xl">{badge.unlocked ? badge.emoji : '🔒'}</span>
            <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight">
              {badge.unlocked ? badge.label : '???'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
