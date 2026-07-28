import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useMyChores } from '../hooks/useChores.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { ChoreSettings } from '../components/ChoreSettings.js';
import { ChoreList } from '../components/ChoreList.js';
import { MealPlanCard } from '../components/MealPlanCard.js';
import { ShoppingList } from '../components/ShoppingList.js';
import { ChildPointsSummary, PointsRewardManager } from '../components/PointsRewards.js';

type MaisonSubTab = 'chores' | 'meals' | 'shopping';
const SUB_TAB_LABELS: Record<MaisonSubTab, string> = { chores: 'Corvées', meals: 'Repas', shopping: 'Courses' };
const SUB_TAB_ORDER: MaisonSubTab[] = ['chores', 'meals', 'shopping'];
const SWIPE_THRESHOLD = 60;

/** Sub-tab lives in the URL (?tab=meals) so it can be reached directly from Accueil's
 * shortcuts, and so RootLayout's usage tracking can tell them apart — same pattern as
 * MoneyPage's Argent/Actions sub-tab. */
function useMaisonSubTab(): [MaisonSubTab, (tab: MaisonSubTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: MaisonSubTab = requested === 'meals' || requested === 'shopping' ? requested : 'chores';
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

/** Renders all 3 sub-tab panels side by side and slides between them — swipe left/right, or
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
    <div className="overflow-hidden" onPointerDown={startSwipeUnlessInteractive(dragControls)}>
      <motion.div
        className="flex w-[300%]"
        animate={{ x: `-${index * (100 / 3)}%` }}
        transition={{ type: 'tween', duration: 0.25 }}
        drag="x"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
      >
        {SUB_TAB_ORDER.map((t) => (
          <div key={t} className="w-1/3 shrink-0 px-1">
            {panels[t]}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** "Maison" section: corvées, repas du soir, and the shared shopping list, presented as
 * sub-tabs the same way the Argent section splits Argent/Actions — swipeable too. */
export function ChoresPage() {
  const { data: user } = useCurrentUser();
  if (user?.interfaceLevel === 'YOUNG') return <Navigate to="/dashboard" replace />;
  return user?.role === 'PARENT' ? <ParentChoresPage /> : <ChildChoresPage />;
}

function ParentChoresPage() {
  const overview = useParentOverview();
  const [tab, setTab] = useMaisonSubTab();

  const choresPanel = (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Corvées</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Les corvées faites par les enfants sont à valider depuis Accueil, sous « Demandes ».
        </p>
        {overview.data && <ChoreSettings children={overview.data.children} />}
      </div>

      {overview.data && <PointsRewardManager children={overview.data.children} />}
    </div>
  );

  return (
    <div className="space-y-6">
      <SubTabs active={tab} onChange={setTab} />

      <SwipeablePanels
        tab={tab}
        onChange={setTab}
        panels={{ chores: choresPanel, meals: <MealPlanCard />, shopping: <ShoppingList /> }}
      />
    </div>
  );
}

type ChoreScope = 'today' | 'week';
const SCOPE_LABELS: Record<ChoreScope, string> = { today: "Aujourd'hui", week: 'Cette semaine' };

function ChildChoresPage() {
  const chores = useMyChores();
  const [scope, setScope] = useState<ChoreScope>('today');
  const [tab, setTab] = useMaisonSubTab();

  // "Aujourd'hui" hides WEEKLY chores (not due today specifically); "Cette semaine" shows
  // everything, including the ones due later in the week.
  const visibleChores = (chores.data ?? []).filter((c) => scope === 'week' || c.recurrence !== 'WEEKLY');

  const choresPanel = (
    <div className="space-y-8">
      <ChildPointsSummary />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes corvées</h2>
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
        </div>
        {chores.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {chores.isError && <p className="text-red-600 dark:text-red-400">Impossible de charger les corvées.</p>}
        {chores.data && (
          <ChoreList
            chores={visibleChores}
            emptyLabel={scope === 'today' ? "Aucune corvée aujourd'hui." : 'Aucune corvée cette semaine.'}
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
        panels={{ chores: choresPanel, meals: <MealPlanCard />, shopping: <ShoppingList /> }}
      />
    </div>
  );
}
