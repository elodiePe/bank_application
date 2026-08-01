import { motion } from 'framer-motion';
import { CHORE_RECURRENCE_LABELS, type ChoreSummary, type PersonalTaskSummary } from '@banque-familiale/shared';
import { useCompleteChore, usePostponeChore } from '../hooks/useChores.js';
import { formatChoreReward } from '../utils/chore.js';
import { statusBackgroundClass } from '../utils/statusColors.js';
import type { DutyRow } from '../hooks/useWeeklyDuties.js';
import { DutyCard } from './DutyCard.js';
import { PersonalTaskCard } from './PersonalTasks.js';
import { KebabMenu } from './KebabMenu.js';

const STATUS_LABELS: Record<NonNullable<ChoreSummary['currentPeriodStatus']>, string> = {
  PENDING: 'Envoyé, en attente',
  APPROVED: 'Validé ✅',
  REJECTED: 'Refusé — réessaie',
};

function ChoreCard({ chore, index }: { chore: ChoreSummary; index: number }) {
  const completeChore = useCompleteChore();
  const postponeChore = usePostponeChore();
  const canComplete = chore.currentPeriodStatus === null || chore.currentPeriodStatus === 'REJECTED';
  // DAILY chores already reset on their own the next day — postponing one wouldn't mean
  // anything, so the option is only offered for WEEKLY/ONCE.
  const canPostpone = canComplete && chore.recurrence !== 'DAILY';

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700 ${statusBackgroundClass(chore.currentPeriodStatus ?? '')}`}
    >
      <div>
        <p className={chore.currentPeriodStatus === 'APPROVED' ? 'font-medium line-through opacity-60' : 'font-medium'}>
          {chore.title}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {[formatChoreReward(chore), CHORE_RECURRENCE_LABELS[chore.recurrence]].filter(Boolean).join(' · ')}
        </p>
      </div>
      {canComplete ? (
        <div className="flex shrink-0 items-center gap-2">
          {canPostpone && (
            <button
              type="button"
              onClick={() => postponeChore.mutate(chore.id)}
              disabled={postponeChore.isPending}
              className="hidden rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 sm:inline-flex"
            >
              Repousser à demain
            </button>
          )}
          <button
            type="button"
            onClick={() => completeChore.mutate(chore.id)}
            disabled={completeChore.isPending}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Fait !
          </button>
          {canPostpone && (
            <div className="sm:hidden">
              <KebabMenu
                items={[
                  {
                    label: 'Repousser à demain',
                    onClick: () => postponeChore.mutate(chore.id),
                    disabled: postponeChore.isPending,
                  },
                ]}
              />
            </div>
          )}
        </div>
      ) : (
        <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
          {STATUS_LABELS[chore.currentPeriodStatus!]}
        </span>
      )}
    </motion.li>
  );
}

type ListEntry =
  | { kind: 'chore'; date: string; item: ChoreSummary }
  | { kind: 'duty'; date: string; item: DutyRow }
  | { kind: 'task'; date: string; item: PersonalTaskSummary };

/** A chore has no calendar date and a recurring personal task's date doesn't apply either — both
 * sort as "today" so they land alongside today's items instead of at an arbitrary end. */
function buildEntries(chores: ChoreSummary[], dutyRows: DutyRow[], taskRows: PersonalTaskSummary[]): ListEntry[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    ...chores.map((item): ListEntry => ({ kind: 'chore', date: today, item })),
    ...dutyRows.map((item): ListEntry => ({ kind: 'duty', date: item.postponedTo ?? item.date, item })),
    ...taskRows.map((item): ListEntry => ({ kind: 'task', date: item.recurring ? today : item.date!, item })),
  ];
}

/** `duties` (meal-plan/laundry turns) and `personalTasks` (self-created, no reward) are both
 * rendered as extra cards in the same list — neither is a real Chore, but from the member's
 * point of view they're just other things on their plate this week, so they belong in "Mes
 * tâches" too rather than tucked away under their own heading or behind a modal. */
export function ChoreList({
  chores,
  emptyLabel,
  duties,
  dutiesPending,
  onSetDutyStatus,
  personalTasks,
  sortChronologically,
}: {
  chores: ChoreSummary[];
  emptyLabel: string;
  duties?: DutyRow[];
  dutiesPending?: boolean;
  onSetDutyStatus?: (row: DutyRow, data: { done?: boolean; postponeToDate?: string | null }) => void;
  personalTasks?: PersonalTaskSummary[];
  /** Sort every item by date instead of grouping by kind — meant for the "Cette semaine" scope,
   * where seeing what's due when matters more than what kind of thing it is. */
  sortChronologically?: boolean;
}) {
  const dutyRows = duties ?? [];
  const taskRows = personalTasks ?? [];

  if (chores.length === 0 && dutyRows.length === 0 && taskRows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  const entries = buildEntries(chores, dutyRows, taskRows);
  if (sortChronologically) entries.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry, index) => {
        if (entry.kind === 'chore') return <ChoreCard key={entry.item.id} chore={entry.item} index={index} />;
        if (entry.kind === 'duty') {
          return (
            <DutyCard
              key={entry.item.key}
              row={entry.item}
              index={index}
              isPending={dutiesPending ?? false}
              onSetStatus={onSetDutyStatus ?? (() => {})}
            />
          );
        }
        return <PersonalTaskCard key={entry.item.id} task={entry.item} index={index} />;
      })}
    </ul>
  );
}
