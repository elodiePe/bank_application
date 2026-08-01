import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import type { PersonalTaskSummary } from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useParentMode } from '../hooks/useParentMode.js';
import { useMyChores } from '../hooks/useChores.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { useWeeklyDuties, type DutyRow } from '../hooks/useWeeklyDuties.js';
import { useMyPersonalTasks } from '../hooks/usePersonalTasks.js';
import { ChoreSettings } from '../components/ChoreSettings.js';
import { ChoreList } from '../components/ChoreList.js';
import { DutyCard } from '../components/DutyCard.js';
import { MealPlanCard } from '../components/MealPlanCard.js';
import { ShoppingList } from '../components/ShoppingList.js';
import { LaundryCard } from '../components/LaundryCard.js';
import { ChildPointsSummary, PointsRewardManager } from '../components/PointsRewards.js';
import { AddPersonalTaskButton, AddPersonalTaskModal, PersonalTaskCard } from '../components/PersonalTasks.js';
import { KebabMenu } from '../components/KebabMenu.js';

type ChoreScope = 'today' | 'week';
const SCOPE_LABELS: Record<ChoreScope, string> = { today: "Aujourd'hui", week: 'Cette semaine' };

/** Scope toggle + "+ Tâche perso" entry point above "(Mes) Tâches". On mobile the two controls
 * collapse into a single "⋮" menu — same items, just tucked away instead of eating header
 * width next to the section title. */
function TaskListHeaderControls({ scope, setScope }: { scope: ChoreScope; setScope: (s: ChoreScope) => void }) {
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  return (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {(Object.keys(SCOPE_LABELS) as ChoreScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              aria-current={scope === s ? 'page' : undefined}
              className={
                scope === s
                  ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white dark:bg-brand-500'
                  : 'rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
        <AddPersonalTaskButton />
      </div>

      <div className="sm:hidden">
        <KebabMenu
          items={[
            { label: scope === 'today' ? "Aujourd'hui ✓" : "Aujourd'hui", onClick: () => setScope('today') },
            { label: scope === 'week' ? 'Cette semaine ✓' : 'Cette semaine', onClick: () => setScope('week') },
            { label: '+ Tâche perso', onClick: () => setAddTaskOpen(true) },
          ]}
        />
      </div>

      <AddPersonalTaskModal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </>
  );
}

type MaisonSubTab = 'chores' | 'meals' | 'shopping' | 'laundry';
const SUB_TAB_LABELS: Record<MaisonSubTab, string> = {
  chores: 'Tâches',
  meals: 'Repas',
  shopping: 'Courses',
  laundry: 'Lessives',
};
const SUB_TAB_ORDER: MaisonSubTab[] = ['chores', 'meals', 'shopping', 'laundry'];
const SWIPE_THRESHOLD = 60;

/** Sub-tab lives in the URL (?tab=meals) so it can be reached directly from Accueil's
 * shortcuts, and so RootLayout's usage tracking can tell them apart — same pattern as
 * MoneyPage's Argent/Actions sub-tab. */
function useMaisonSubTab(): [MaisonSubTab, (tab: MaisonSubTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: MaisonSubTab =
    requested === 'meals' || requested === 'shopping' || requested === 'laundry' ? requested : 'chores';
  const setTab = (next: MaisonSubTab) => {
    setSearchParams(next === 'chores' ? {} : { tab: next }, { replace: true });
  };
  return [tab, setTab];
}

// Framer Motion's drag gesture claims the pointer on down, which otherwise swallows the click
// on anything interactive underneath — so the drag is only started manually, and never when the
// touch begins on an interactive element (a chore's "Valider" button, a day in the meal plan…).
const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role="button"], [contenteditable="true"]';

function startSwipeUnlessInteractive(dragControls: ReturnType<typeof useDragControls>) {
  return (event: ReactPointerEvent) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
    dragControls.start(event);
  };
}

function SubTabs({ active, onChange }: { active: MaisonSubTab; onChange: (tab: MaisonSubTab) => void }) {
  return (
    <div className="mb-6 flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
      {SUB_TAB_ORDER.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          aria-current={active === tab ? 'page' : undefined}
          className={
            active === tab
              ? 'flex-1 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white dark:bg-brand-500'
              : 'flex-1 rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          {SUB_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

/** Renders all 4 sub-tab panels side by side and slides between them — swipe left/right, or
 * use the SubTabs buttons — same technique as the Argent/Actions swipe on the Argent page. */
function SwipeablePanels({
  tab,
  onChange,
  panels,
}: {
  tab: MaisonSubTab;
  onChange: (tab: MaisonSubTab) => void;
  panels: Record<MaisonSubTab, ReactNode>;
}) {
  const index = SUB_TAB_ORDER.indexOf(tab);
  const dragControls = useDragControls();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && index < SUB_TAB_ORDER.length - 1) {
      onChange(SUB_TAB_ORDER[index + 1]!);
    } else if (info.offset.x > SWIPE_THRESHOLD && index > 0) {
      onChange(SUB_TAB_ORDER[index - 1]!);
    }
  };

  return (
    <div
      className="overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={startSwipeUnlessInteractive(dragControls)}
    >
      <motion.div
        className="flex w-[400%]"
        animate={{ x: `-${index * (100 / 4)}%` }}
        transition={{ type: 'tween', duration: 0.25 }}
        drag="x"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
      >
        {SUB_TAB_ORDER.map((t) => (
          <div key={t} className="w-1/4 shrink-0 px-1">
            {panels[t]}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** "Maison" section: tâches, repas du soir, and the shared shopping list, presented as
 * sub-tabs the same way the Argent section splits Argent/Actions — swipeable too. */
export function ChoresPage() {
  const { data: user } = useCurrentUser();
  if (user?.interfaceLevel === 'YOUNG') return <Navigate to="/dashboard" replace />;
  return user?.role === 'PARENT' ? <ParentChoresPage /> : <ChildChoresPage />;
}

function ParentChoresPage() {
  const overview = useParentOverview();
  const [tab, setTab] = useMaisonSubTab();
  const { parentModeEnabled } = useParentMode();
  const duties = useWeeklyDuties();
  const personalTasks = useMyPersonalTasks();
  const [scope, setScope] = useState<ChoreScope>('today');

  const todayIso = new Date().toISOString().slice(0, 10);
  const visibleDuties = scope === 'week' ? duties.rows : duties.rows.filter((row) => row.date === todayIso);
  const visiblePersonalTasks = (personalTasks.data ?? []).filter(
    (t) => t.recurring || scope === 'week' || t.date === todayIso,
  );

  // In "Cette semaine", interleave duties and personal tasks by date instead of grouping by
  // kind — a recurring task (no calendar date) sorts as today, same as ChoreList does.
  type ParentEntry =
    | { kind: 'duty'; key: string; date: string; item: DutyRow }
    | { kind: 'task'; key: string; date: string; item: PersonalTaskSummary };
  const parentEntries: ParentEntry[] = [
    ...visibleDuties.map((row): ParentEntry => ({ kind: 'duty', key: row.key, date: row.postponedTo ?? row.date, item: row })),
    ...visiblePersonalTasks.map(
      (task): ParentEntry => ({ kind: 'task', key: task.id, date: task.recurring ? todayIso : task.date!, item: task }),
    ),
  ];
  if (scope === 'week') parentEntries.sort((a, b) => a.date.localeCompare(b.date));

  const choresPanel = (
    <div className="space-y-6">
      <div>
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Tâches</h2>
          <TaskListHeaderControls scope={scope} setScope={setScope} />
        </div>
        {parentModeEnabled && (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Les tâches faites par les enfants sont à valider depuis Accueil, sous « Demandes ».
          </p>
        )}

        {parentEntries.length > 0 && (
          <ul className="mb-5 flex flex-col gap-2">
            {parentEntries.map((entry, index) =>
              entry.kind === 'duty' ? (
                <DutyCard
                  key={entry.key}
                  row={entry.item}
                  index={index}
                  isPending={duties.isPending}
                  onSetStatus={duties.setStatus}
                />
              ) : (
                <PersonalTaskCard key={entry.key} task={entry.item} index={index} />
              ),
            )}
          </ul>
        )}

        {parentModeEnabled ? (
          overview.data && <ChoreSettings children={overview.data.children} />
        ) : (
          <Link
            to="/settings"
            className="block rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Mode gestion désactivé — réactive-le dans les Paramètres pour gérer les tâches →
          </Link>
        )}
      </div>

      {parentModeEnabled && overview.data && <PointsRewardManager children={overview.data.children} />}
    </div>
  );

  return (
    <div className="space-y-6">
      <SubTabs active={tab} onChange={setTab} />

      <SwipeablePanels
        tab={tab}
        onChange={setTab}
        panels={{ chores: choresPanel, meals: <MealPlanCard />, shopping: <ShoppingList />, laundry: <LaundryCard /> }}
      />
    </div>
  );
}

function ChildChoresPage() {
  const chores = useMyChores();
  const duties = useWeeklyDuties();
  const personalTasks = useMyPersonalTasks();
  const [scope, setScope] = useState<ChoreScope>('today');
  const [tab, setTab] = useMaisonSubTab();

  // "Aujourd'hui" hides WEEKLY chores (not due today specifically); "Cette semaine" shows
  // everything, including the ones due later in the week. Meal/laundry duties get the same
  // today-only filter.
  const visibleChores = (chores.data ?? []).filter((c) => scope === 'week' || c.recurrence !== 'WEEKLY');
  const todayIso = new Date().toISOString().slice(0, 10);
  const visibleDuties = scope === 'week' ? duties.rows : duties.rows.filter((row) => row.date === todayIso);
  // Recurring tasks show every day; one-off tasks only show on "Aujourd'hui" if they're due today.
  const visiblePersonalTasks = (personalTasks.data ?? []).filter(
    (t) => t.recurring || scope === 'week' || t.date === todayIso,
  );

  const choresPanel = (
    <div className="space-y-8">
      <ChildPointsSummary />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mes tâches</h2>
          <TaskListHeaderControls scope={scope} setScope={setScope} />
        </div>
        {(chores.isLoading || duties.isLoading) && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {chores.isError && <p className="text-red-600 dark:text-red-400">Impossible de charger les tâches.</p>}
        {chores.data && !duties.isLoading && (
          <ChoreList
            chores={visibleChores}
            duties={visibleDuties}
            dutiesPending={duties.isPending}
            onSetDutyStatus={duties.setStatus}
            personalTasks={visiblePersonalTasks}
            sortChronologically={scope === 'week'}
            emptyLabel={scope === 'today' ? "Aucune tâche aujourd'hui." : 'Aucune tâche cette semaine.'}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SubTabs active={tab} onChange={setTab} />

      <SwipeablePanels
        tab={tab}
        onChange={setTab}
        panels={{ chores: choresPanel, meals: <MealPlanCard />, shopping: <ShoppingList />, laundry: <LaundryCard /> }}
      />
    </div>
  );
}
