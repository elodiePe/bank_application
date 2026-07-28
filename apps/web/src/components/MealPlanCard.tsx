import { useState } from 'react';
import {
  WEEKDAY_LABELS,
  type FamilyMemberDetail,
  type MealPlanDayMode,
  type MealPlanDaySummary,
} from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useMembers } from '../hooks/useMembers.js';
import {
  useMealPlanConfig,
  useMealPlanRotationOrder,
  useMealPlanUpcoming,
  useSetMealPlanDay,
  useSetMealPlanRotationOrder,
} from '../hooks/useMealPlan.js';
import { Modal } from './Modal.js';
import { Select } from './Select.js';

type ViewMode = 'week' | 'month';
const VIEW_LABELS: Record<ViewMode, string> = { week: '7 jours', month: 'Mois' };
const VIEW_DAYS: Record<ViewMode, number> = { week: 7, month: 28 };

// Literal (not interpolated) so Tailwind's class scanner always picks them up. Hues are spread
// far apart around the wheel (not just adjacent pastels) so who's cooking reads from color
// alone, at a glance, without needing to read the name. A colored left border reinforces the
// same hue as a second, stronger band beyond the background tint. Assigned by first appearance
// in the visible window, so it works for both roles even though children can't fetch the full
// member list — no need to know who's who ahead of time.
interface PersonStyle {
  bg: string;
  border: string;
  text: string;
}

const PERSON_STYLES: PersonStyle[] = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-600', text: 'text-blue-800 dark:text-blue-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-400 dark:border-rose-600', text: 'text-rose-800 dark:text-rose-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-800 dark:text-amber-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-800 dark:text-emerald-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-400 dark:border-violet-600', text: 'text-violet-800 dark:text-violet-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-400 dark:border-cyan-600', text: 'text-cyan-800 dark:text-cyan-300' },
];

function buildPersonColorMap(days: MealPlanDaySummary[]): Map<string, PersonStyle> {
  const map = new Map<string, PersonStyle>();
  for (const day of days) {
    if (day.assignedUserId && !map.has(day.assignedUserId)) {
      map.set(day.assignedUserId, PERSON_STYLES[map.size % PERSON_STYLES.length]!);
    }
  }
  return map;
}

function formatDayDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** The one rotation order shared by every ROTATING weekday — configured once, not per day. */
function RotationOrderEditor({ members }: { members: FamilyMemberDetail[] }) {
  const rotationOrder = useMealPlanRotationOrder();
  const setRotationOrder = useSetMealPlanRotationOrder();
  const [order, setOrder] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  const firstNameOf = (id: string) => members.find((m) => m.id === id)?.firstName ?? '?';
  const currentOrder = rotationOrder.data?.orderedUserIds ?? [];

  if (!editing) {
    return (
      <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-800">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium">Ordre de rotation</p>
          <button
            type="button"
            onClick={() => {
              setOrder(currentOrder);
              setEditing(true);
            }}
            className="text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            Modifier
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {currentOrder.length > 0
            ? (rotationOrder.data?.orderedFirstNames.join(' → ') ?? '')
            : 'Aucun ordre défini — les jours rotatifs resteront vides.'}
        </p>
        {/* <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Un seul ordre, partagé par tous les jours rotatifs — il avance d'une personne chaque semaine.
        </p> */}
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-800">
      <p className="text-sm font-medium">Ordre de rotation</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Clique sur les membres dans l'ordre souhaité — cet ordre est partagé par tous les jours rotatifs.
      </p>
      <div className="flex flex-wrap gap-2">
        {members
          .filter((m) => !order.includes(m.id))
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOrder((prev) => [...prev, m.id])}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30"
            >
              + {m.firstName}
            </button>
          ))}
      </div>
      {order.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {order.map((id, index) => (
            <span
              key={`${id}-${index}`}
              className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
            >
              {index + 1}. {firstNameOf(id)}
              <button
                type="button"
                onClick={() => setOrder((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Retirer"
                className="text-brand-500 hover:text-brand-800 dark:hover:text-brand-200"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
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
          onClick={() => setRotationOrder.mutate({ orderedUserIds: order }, { onSuccess: () => setEditing(false) })}
          disabled={order.length === 0 || setRotationOrder.isPending}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function DayEditorModal({
  weekday,
  initialMode,
  initialFixedUserId,
  members,
  onClose,
}: {
  weekday: number;
  initialMode: MealPlanDayMode;
  initialFixedUserId: string | null;
  members: FamilyMemberDetail[];
  onClose: () => void;
}) {
  const setDay = useSetMealPlanDay();
  const [mode, setMode] = useState<MealPlanDayMode>(initialMode);
  const [fixedUserId, setFixedUserId] = useState(initialFixedUserId ?? members[0]?.id ?? '');

  function submit() {
    if (mode === 'FIXED') {
      if (!fixedUserId) return;
      setDay.mutate({ weekday, mode: 'FIXED', fixedUserId }, { onSuccess: onClose });
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
            <p className="text-sm font-medium">Personne fixe</p>
            <Select
              value={fixedUserId}
              onChange={setFixedUserId}
              options={members.map((m) => ({ value: m.id, label: m.firstName }))}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ce jour utilisera l'ordre de rotation partagé (voir plus haut sur la page).
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={setDay.isPending || (mode === 'FIXED' && !fixedUserId)}
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
  const [view, setView] = useState<ViewMode>('week');
  const [editingWeekday, setEditingWeekday] = useState<number | null>(null);

  const upcoming = useMealPlanUpcoming(VIEW_DAYS[view]);
  const config = useMealPlanConfig();
  const members = useMembers(isParent);

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

      {isParent && activeMembers.length > 0 && <RotationOrderEditor members={activeMembers} />}

      {upcoming.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
      {upcoming.data && upcoming.data.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {upcoming.data.map((day) => {
            // Today's own turn is put front and center — bigger, tinted, badged — so it can't
            // be missed among a week (or month) of otherwise-identical rows.
            const isTodayMine = day.date === todayIso && day.assignedUserId === user?.id;
            const style = day.assignedUserId ? personColors.get(day.assignedUserId) : undefined;
            return (
              <li
                key={day.date}
                onClick={() => isParent && setEditingWeekday(day.weekday)}
                className={
                  isTodayMine
                    ? `flex items-center justify-between rounded-2xl border-2 border-l-8 border-orange-400 bg-orange-50 p-3 shadow-md dark:border-orange-500 dark:bg-orange-900/30 ${isParent ? 'cursor-pointer' : ''}`
                    : `flex items-center justify-between rounded-2xl border border-l-8 p-3 shadow-sm ${style ? `${style.border} ${style.bg}` : 'border-slate-200/70 bg-white dark:border-slate-700/70 dark:bg-slate-800'} ${isParent ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-125' : ''}`
                }
              >
                <span className="text-sm font-medium capitalize">{formatDayDate(day.date)}</span>
                <span
                  className={
                    isTodayMine
                      ? 'text-sm font-bold text-orange-700 dark:text-orange-300'
                      : style
                        ? `text-sm font-bold ${style.text}`
                        : 'text-sm text-slate-500 dark:text-slate-400'
                  }
                >
                  {isTodayMine ? "🍳 C'est toi !" : (day.assignedFirstName ?? '—')}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {editingWeekday !== null && activeMembers.length > 0 && (
        <DayEditorModal
          weekday={editingWeekday}
          initialMode={editingConfig?.mode ?? 'FIXED'}
          initialFixedUserId={editingConfig?.fixedUserId ?? null}
          members={activeMembers}
          onClose={() => setEditingWeekday(null)}
        />
      )}
    </section>
  );
}
