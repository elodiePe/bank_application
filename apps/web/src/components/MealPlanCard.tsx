import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CHORE_REWARD_TYPE_LABELS,
  WEEKDAY_LABELS,
  type ChoreRewardType,
  type FamilyMemberDetail,
  type MealPlanDayMode,
} from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useParentMode } from '../hooks/useParentMode.js';
import { useHouseholdRoster } from '../hooks/useMembers.js';
import {
  useMealPlanChoreConfig,
  useMealPlanConfig,
  useMealPlanRotationOrder,
  useMealPlanUpcoming,
  useSetMealPlanChoreConfig,
  useSetMealPlanDay,
  useSetMealPlanRotationOrder,
} from '../hooks/useMealPlan.js';
import { Modal } from './Modal.js';
import { GroupOrderEditor } from './GroupOrderEditor.js';
import { MultiMemberPicker } from './MultiMemberPicker.js';
import { buildPersonColorMap } from '../utils/personColors.js';

type ViewMode = 'week' | 'month';
const VIEW_LABELS: Record<ViewMode, string> = { week: '7 jours', month: 'Mois' };
const VIEW_DAYS: Record<ViewMode, number> = { week: 7, month: 28 };

function formatDayDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** The one rotation order shared by every ROTATING weekday — configured once, not per day.
 * Each turn in the order can be one person or several doing it together. */
function RotationOrderEditor({ members }: { members: FamilyMemberDetail[] }) {
  const rotationOrder = useMealPlanRotationOrder();
  const setRotationOrder = useSetMealPlanRotationOrder();
  const [groups, setGroups] = useState<string[][]>([]);
  const [editing, setEditing] = useState(false);

  const currentGroups = rotationOrder.data?.orderedGroups ?? [];

  if (!editing) {
    return (
      <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-800">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium">Ordre de rotation</p>
          <button
            type="button"
            onClick={() => {
              setGroups(currentGroups);
              setEditing(true);
            }}
            className="text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            Modifier
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {currentGroups.length > 0
            ? (rotationOrder.data?.orderedGroupFirstNames.map((g) => g.join(' + ')).join(' → ') ?? '')
            : 'Aucun ordre défini — les jours rotatifs resteront vides.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-800">
      <p className="text-sm font-medium">Ordre de rotation</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Clique sur les membres pour ajouter un tour — plusieurs personnes peuvent partager le même tour.
      </p>
      <GroupOrderEditor members={members} groups={groups} onChange={setGroups} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => setRotationOrder.mutate({ orderedGroups: groups }, { onSuccess: () => setEditing(false) })}
          disabled={groups.length === 0 || setRotationOrder.isPending}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

/** Opt-in: turns "c'est toi qui cuisines" into a real chore for the day's cook (only when
 * they're a child) — same reward/approval fields as any other chore. */
function ChoreConfigEditor() {
  const choreConfig = useMealPlanChoreConfig();
  const setChoreConfig = useSetMealPlanChoreConfig();

  const [enabled, setEnabled] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [rewardType, setRewardType] = useState<ChoreRewardType>('POINTS');
  const [rewardCents, setRewardCents] = useState(50);
  const [rewardPoints, setRewardPoints] = useState(10);

  useEffect(() => {
    if (!choreConfig.data) return;
    setEnabled(choreConfig.data.enabled);
    setRequiresApproval(choreConfig.data.requiresApproval);
    setRewardType(choreConfig.data.rewardType);
    if (choreConfig.data.rewardCents != null) setRewardCents(choreConfig.data.rewardCents);
    if (choreConfig.data.rewardPoints != null) setRewardPoints(choreConfig.data.rewardPoints);
  }, [choreConfig.data]);

  function save(next: Partial<{ enabled: boolean; requiresApproval: boolean; rewardType: ChoreRewardType }>) {
    const merged = { enabled, requiresApproval, rewardType, ...next };
    setEnabled(merged.enabled);
    setRequiresApproval(merged.requiresApproval);
    setRewardType(merged.rewardType);
    setChoreConfig.mutate({
      enabled: merged.enabled,
      requiresApproval: merged.requiresApproval,
      rewardType: merged.rewardType,
      rewardCents: merged.rewardType === 'MONEY' ? rewardCents : undefined,
      rewardPoints: merged.rewardType === 'POINTS' ? rewardPoints : undefined,
    });
  }

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-800">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => save({ enabled: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
        />
        Transformer le tour de cuisine en tâche
      </label>

      {enabled && (
        <div className="space-y-2 pl-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => save({ requiresApproval: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
            />
            Nécessite une validation du parent
          </label>

          <div className="flex gap-2">
            {(['MONEY', 'POINTS', 'NONE'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => save({ rewardType: type })}
                className={
                  rewardType === type
                    ? 'flex-1 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                    : 'flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                }
              >
                {CHORE_REWARD_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {rewardType === 'MONEY' && (
            <input
              type="number"
              step="1"
              value={rewardCents}
              onChange={(e) => setRewardCents(Number(e.target.value))}
              onBlur={() => setChoreConfig.mutate({ enabled, requiresApproval, rewardType, rewardCents })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="Montant (centimes)"
            />
          )}
          {rewardType === 'POINTS' && (
            <input
              type="number"
              step="1"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(Number(e.target.value))}
              onBlur={() => setChoreConfig.mutate({ enabled, requiresApproval, rewardType, rewardPoints })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="Nombre de points"
            />
          )}
        </div>
      )}
    </div>
  );
}

function DayEditorModal({
  weekday,
  initialMode,
  initialFixedUserIds,
  members,
  onClose,
}: {
  weekday: number;
  initialMode: MealPlanDayMode;
  initialFixedUserIds: string[];
  members: FamilyMemberDetail[];
  onClose: () => void;
}) {
  const setDay = useSetMealPlanDay();
  const [mode, setMode] = useState<MealPlanDayMode>(initialMode);
  const [fixedUserIds, setFixedUserIds] = useState<string[]>(
    initialFixedUserIds.length > 0 ? initialFixedUserIds : members[0] ? [members[0].id] : [],
  );

  function submit() {
    if (mode === 'FIXED') {
      if (fixedUserIds.length === 0) return;
      setDay.mutate({ weekday, mode: 'FIXED', fixedUserIds }, { onSuccess: onClose });
    } else {
      setDay.mutate({ weekday, mode: 'ROTATING' }, { onSuccess: onClose });
    }
  }

  return (
    <Modal open onClose={onClose} title={WEEKDAY_LABELS[weekday] ?? ''}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['FIXED', 'ROTATING'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                mode === m
                  ? 'flex-1 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white'
                  : 'flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }
            >
              {m === 'FIXED' ? 'Fixe' : 'Rotatif'}
            </button>
          ))}
        </div>

        {mode === 'FIXED' ? (
          <>
            <p className="text-sm font-medium">Personne(s) fixe(s)</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choisis-en plusieurs si elles font le repas ensemble ce jour-là.
            </p>
            <MultiMemberPicker members={members} selected={fixedUserIds} onChange={setFixedUserIds} />
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ce jour utilisera l'ordre de rotation partagé (voir plus haut sur la page).
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={setDay.isPending || (mode === 'FIXED' && fixedUserIds.length === 0)}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}

export function MealPlanCard() {
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';
  const isTeen = user?.interfaceLevel === 'TEEN';
  const { parentModeEnabled } = useParentMode();
  // Who cooks which day, and the shared rotation order — a parent or a TEEN-interface child
  // can edit both, gated by the same "Mode gestion" toggle (Paramètres) either way. The "turn
  // a meal into a chore" reward config is a separate, stricter admin gate below (money/points,
  // parent-only regardless of the toggle).
  const canEdit = isParent || isTeen;
  const showAdmin = canEdit && parentModeEnabled;
  const showParentOnlyAdmin = isParent && parentModeEnabled;
  const [view, setView] = useState<ViewMode>('week');
  const [editingWeekday, setEditingWeekday] = useState<number | null>(null);

  const upcoming = useMealPlanUpcoming(VIEW_DAYS[view]);
  const config = useMealPlanConfig();
  const members = useHouseholdRoster(showAdmin);

  const activeMembers = (members.data ?? []).filter((m) => m.isActive);
  const editingConfig = editingWeekday !== null ? config.data?.find((c) => c.weekday === editingWeekday) : undefined;
  const todayIso = new Date().toISOString().slice(0, 10);
  const personColors = buildPersonColorMap(upcoming.data ?? []);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Repas du soir</h2>
        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-current={view === v ? 'page' : undefined}
              className={
                view === v
                  ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white dark:bg-brand-500'
                  : 'rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* {canEdit && !parentModeEnabled && (
        <Link
          to="/settings"
          className="mb-4 block rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Mode gestion désactivé — réactive-le dans les Paramètres pour gérer les repas →
        </Link>
      )} */}
      {showAdmin && activeMembers.length > 0 && <RotationOrderEditor members={activeMembers} />}
      {showParentOnlyAdmin && <ChoreConfigEditor />}

      {upcoming.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
      {upcoming.data && upcoming.data.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-5">
          {upcoming.data.map((day) => {
            // Today's own turn is put front and center — bigger, tinted, badged — so it can't
            // be missed among a week (or month) of otherwise-identical rows.
            const isTodayMine = day.date === todayIso && day.assignedUserIds.includes(user?.id ?? '');
            // A shared turn (several people) doesn't get a single person's color — plain style.
            const style = day.assignedUserIds.length === 1 ? personColors.get(day.assignedUserIds[0]!) : undefined;
            return (
              <li
                key={day.date}
                onClick={() => showAdmin && setEditingWeekday(day.weekday)}
                className={
                  isTodayMine
                    ? `flex items-center justify-between rounded-2xl border-2 border-l-8 border-orange-400 bg-orange-50 p-3 shadow-md dark:border-orange-500 dark:bg-orange-900/30 ${showAdmin ? 'cursor-pointer' : ''}`
                    : `flex items-center justify-between rounded-2xl border border-l-8 p-3 shadow-sm ${style ? `${style.border} ${style.bg}` : 'border-slate-200/70 bg-white dark:border-slate-700/70 dark:bg-slate-800'} ${showAdmin ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-125' : ''}`
                }
              >
                <span className="text-sm font-medium capitalize">
                  {formatDayDate(day.date)}
                  {day.postponedTo && (
                    <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(reporté)</span>
                  )}
                </span>
                <span
                  className={
                    day.done
                      ? 'text-sm text-slate-400 line-through dark:text-slate-500'
                      : isTodayMine
                        ? 'text-sm font-bold text-orange-700 dark:text-orange-300'
                        : style
                          ? `text-sm font-bold ${style.text}`
                          : 'text-sm text-slate-500 dark:text-slate-400'
                  }
                >
                  {day.done
                    ? 'Fait ✅'
                    : isTodayMine
                      ? "🍳 C'est toi !"
                      : day.assignedFirstNames.length > 0
                        ? day.assignedFirstNames.join(' + ')
                        : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
  {canEdit && !parentModeEnabled && (
        <Link
          to="/settings"
          className="block rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Mode gestion désactivé — réactive-le dans les Paramètres pour gérer les repas →
        </Link>
      )}
      {editingWeekday !== null && activeMembers.length > 0 && (
        <DayEditorModal
          weekday={editingWeekday}
          initialMode={editingConfig?.mode ?? 'FIXED'}
          initialFixedUserIds={editingConfig?.fixedUserIds ?? []}
          members={activeMembers}
          onClose={() => setEditingWeekday(null)}
        />
      )}
    </section>
  );
}
