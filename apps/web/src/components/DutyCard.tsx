import { motion } from 'framer-motion';
import type { DutyRow } from '../hooks/useWeeklyDuties.js';
import { tomorrowOf } from '../hooks/useWeeklyDuties.js';
import { formatTaskDate } from '../utils/taskDate.js';
import { KebabMenu } from './KebabMenu.js';

/** One meal-plan/laundry duty row, styled to match ChoreCard/PersonalTaskCard so it reads as
 * just another item in "Mes tâches" rather than a separate kind of thing. */
export function DutyCard({
  row,
  index,
  isPending,
  onSetStatus,
}: {
  row: DutyRow;
  index: number;
  isPending: boolean;
  onSetStatus: (row: DutyRow, data: { done?: boolean; postponeToDate?: string | null }) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = row.date === todayIso;
  const isPostponed = row.postponedTo !== null;
  // Postponing a meal doesn't make sense — someone still has to eat that day — so it's only
  // offered for laundry, which can genuinely wait until tomorrow.
  const canPostpone = row.kind !== 'meal';

  const subtitleParts = [
    row.withNames.length > 0 ? `avec ${row.withNames.join(', ')}` : null,
    isPostponed
      ? `Reporté au ${formatTaskDate(row.postponedTo!)}`
      : isToday
        ? "Aujourd'hui"
        : formatTaskDate(row.date),
  ].filter(Boolean);

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={
        isToday && !isPostponed
          ? 'flex items-center justify-between gap-2 rounded-xl border-2 border-orange-400 bg-orange-50 p-3 shadow-sm dark:border-orange-500 dark:bg-orange-900/30'
          : 'flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700'
      }
    >
      <div>
        <p className={row.done ? 'font-medium line-through opacity-60' : 'font-medium'}>
          <span aria-hidden>{row.icon} </span>
          {row.label}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitleParts.join(' · ')}</p>
      </div>

      {row.done ? (
        <button
          type="button"
          onClick={() => onSetStatus(row, { done: false })}
          disabled={isPending}
          className="shrink-0 text-xs font-medium text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
        >
          Annuler
        </button>
      ) : isPostponed ? (
        <button
          type="button"
          onClick={() => onSetStatus(row, { postponeToDate: null })}
          disabled={isPending}
          className="shrink-0 text-xs font-medium text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
        >
          Annuler
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {canPostpone && (
            <button
              type="button"
              onClick={() => onSetStatus(row, { postponeToDate: tomorrowOf(row.date) })}
              disabled={isPending}
              className="hidden rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 sm:inline-flex"
            >
              Repousser
            </button>
          )}
          <button
            type="button"
            onClick={() => onSetStatus(row, { done: true })}
            disabled={isPending}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Fait !
          </button>
          {canPostpone && (
            <div className="sm:hidden">
              <KebabMenu
                items={[
                  {
                    label: 'Repousser',
                    onClick: () => onSetStatus(row, { postponeToDate: tomorrowOf(row.date) }),
                    disabled: isPending,
                  },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </motion.li>
  );
}
