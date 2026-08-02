import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CHORE_REWARD_TYPE_LABELS,
  LAUNDRY_SCHEDULE_TYPE_LABELS,
  WEEKDAY_LABELS,
  type ChoreRewardType,
  type FamilyMemberDetail,
  type LaundryMode,
  type LaundryOccurrenceSummary,
  type LaundryScheduleType,
  type LaundryTypeSummary,
} from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useParentMode } from '../hooks/useParentMode.js';
import { useHouseholdRoster } from '../hooks/useMembers.js';
import {
  useCreateLaundryType,
  useDeleteLaundryType,
  useLaundryTypes,
  useLaundryUpcoming,
  useUpdateLaundryType,
} from '../hooks/useLaundry.js';
import { Modal } from './Modal.js';
import { GroupOrderEditor } from './GroupOrderEditor.js';
import { MultiMemberPicker } from './MultiMemberPicker.js';
import { IconButton } from './IconButton.js';
import { PencilIcon, TrashIcon } from './icons.js';
import { buildPersonColorMap } from '../utils/personColors.js';

type ViewMode = 'week' | 'month';
const VIEW_LABELS: Record<ViewMode, string> = { week: '7 jours', month: 'Mois' };
const VIEW_DAYS: Record<ViewMode, number> = { week: 7, month: 28 };

function formatOccurrenceDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatOnceDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** One-line summary of when a type is due, shown in the management list. */
function scheduleLabel(type: LaundryTypeSummary): string {
  if (type.scheduleType === 'ONCE') return type.onceDate ? formatOnceDate(type.onceDate) : LAUNDRY_SCHEDULE_TYPE_LABELS.ONCE;
  return type.weekdays.map((d) => WEEKDAY_LABELS[d]).join(', ') || LAUNDRY_SCHEDULE_TYPE_LABELS[type.scheduleType];
}

/** Create/edit modal for one laundry type — name, FIXED (pick a person) or ROTATING (build an
 * order just for this type, unlike meal plan's one shared order, since laundry types are
 * user-defined and don't share a natural cadence with each other). */
function TypeEditorModal({
  initial,
  members,
  onClose,
}: {
  initial: LaundryTypeSummary | null;
  members: FamilyMemberDetail[];
  onClose: () => void;
}) {
  const create = useCreateLaundryType();
  const update = useUpdateLaundryType();
  const [name, setName] = useState(initial?.name ?? '');
  const [mode, setMode] = useState<LaundryMode>(initial?.mode ?? 'FIXED');
  const [fixedUserIds, setFixedUserIds] = useState<string[]>(
    initial?.fixedUserIds && initial.fixedUserIds.length > 0
      ? initial.fixedUserIds
      : members[0]
        ? [members[0].id]
        : [],
  );
  const [rotationGroups, setRotationGroups] = useState<string[][]>(initial?.rotationGroups ?? []);
  const [scheduleType, setScheduleType] = useState<LaundryScheduleType>(initial?.scheduleType ?? 'WEEKLY');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [onceDate, setOnceDate] = useState(initial?.onceDate ?? '');
  const [generatesChore, setGeneratesChore] = useState(initial?.generatesChore ?? false);
  const [choreRequiresApproval, setChoreRequiresApproval] = useState(initial?.choreRequiresApproval ?? true);
  const [choreRewardType, setChoreRewardType] = useState<ChoreRewardType>(initial?.choreRewardType ?? 'POINTS');
  const [choreRewardCents, setChoreRewardCents] = useState(initial?.choreRewardCents ?? 50);
  const [choreRewardPoints, setChoreRewardPoints] = useState(initial?.choreRewardPoints ?? 10);

  const isPending = create.isPending || update.isPending;
  const scheduleValid =
    scheduleType === 'ONCE'
      ? !!onceDate
      : scheduleType === 'WEEKLY'
        ? weekdays.length === 1
        : weekdays.length >= 2;
  const canSubmit =
    name.trim().length > 0 &&
    (mode === 'FIXED' ? fixedUserIds.length > 0 : rotationGroups.length > 0) &&
    scheduleValid;

  function toggleWeekday(day: number) {
    setWeekdays((prev) => {
      if (scheduleType === 'WEEKLY') return [day];
      return prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
    });
  }

  function selectScheduleType(next: LaundryScheduleType) {
    setScheduleType(next);
    if (next === 'WEEKLY') setWeekdays((prev) => (prev.length === 1 ? prev : prev.slice(0, 1)));
  }

  function submit() {
    if (!canSubmit) return;
    const input = {
      name: name.trim(),
      mode,
      fixedUserIds: mode === 'FIXED' ? fixedUserIds : undefined,
      rotationGroups: mode === 'ROTATING' ? rotationGroups : undefined,
      scheduleType,
      weekdays: scheduleType === 'ONCE' ? undefined : weekdays,
      onceDate: scheduleType === 'ONCE' ? onceDate : undefined,
      generatesChore,
      choreRequiresApproval,
      choreRewardType: generatesChore ? choreRewardType : undefined,
      choreRewardCents: generatesChore && choreRewardType === 'MONEY' ? choreRewardCents : undefined,
      choreRewardPoints: generatesChore && choreRewardType === 'POINTS' ? choreRewardPoints : undefined,
    };
    if (initial) {
      update.mutate({ id: initial.id, input }, { onSuccess: onClose });
    } else {
      create.mutate(input, { onSuccess: onClose });
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Modifier le type de ménage' : 'Nouveau type de ménage'}>
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="laundry-name">
          Nom (ex. Blancs, Couleurs, Draps…)
        </label>
        <input
          id="laundry-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

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
              Choisis-en plusieurs si elles s'en occupent ensemble.
            </p>
            <MultiMemberPicker members={members} selected={fixedUserIds} onChange={setFixedUserIds} />
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Ordre de rotation</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clique sur les membres pour ajouter un tour — plusieurs personnes peuvent partager le même tour.
              L'ordre avance automatiquement à chaque occurrence.
            </p>
            <GroupOrderEditor members={members} groups={rotationGroups} onChange={setRotationGroups} />
          </>
        )}

        <p className="mt-1 text-sm font-medium">Quand</p>
        <div className="flex flex-wrap gap-2">
          {(['ONCE', 'WEEKLY', 'MULTIPLE'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectScheduleType(s)}
              className={
                scheduleType === s
                  ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }
            >
              {LAUNDRY_SCHEDULE_TYPE_LABELS[s]}
            </button>
          ))}
        </div>

        {scheduleType === 'ONCE' ? (
          <input
            type="date"
            value={onceDate}
            onChange={(e) => setOnceDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {scheduleType === 'WEEKLY' ? 'Choisis le jour.' : 'Choisis les jours.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWeekday(day)}
                  className={
                    weekdays.includes(day)
                      ? 'rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400'
                      : 'rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="mt-1 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={generatesChore}
            onChange={(e) => setGeneratesChore(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
          />
          Transformer en tâche
        </label>

        {generatesChore && (
          <div className="space-y-2 pl-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={choreRequiresApproval}
                onChange={(e) => setChoreRequiresApproval(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
              />
              Nécessite une validation du parent
            </label>

            <div className="flex gap-2">
              {(['MONEY', 'POINTS', 'NONE'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChoreRewardType(type)}
                  className={
                    choreRewardType === type
                      ? 'flex-1 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                      : 'flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                  }
                >
                  {CHORE_REWARD_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            {choreRewardType === 'MONEY' && (
              <input
                type="number"
                step="1"
                value={choreRewardCents}
                onChange={(e) => setChoreRewardCents(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Montant (centimes)"
              />
            )}
            {choreRewardType === 'POINTS' && (
              <input
                type="number"
                step="1"
                value={choreRewardPoints}
                onChange={(e) => setChoreRewardPoints(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Nombre de points"
              />
            )}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={isPending || !canSubmit}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}

function UpcomingList({ occurrences }: { occurrences: LaundryOccurrenceSummary[] }) {
  const { data: user } = useCurrentUser();
  const todayIso = new Date().toISOString().slice(0, 10);
  const personColors = buildPersonColorMap(occurrences);

  if (occurrences.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Rien de prévu pour l'instant.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {occurrences.map((occ) => {
        // Today's own turn is put front and center — bigger, badged — same treatment as the
        // meal plan's "C'est toi !" card. It keeps the person's own color (not a separate
        // orange highlight) so the color-coding stays consistent across the whole calendar.
        const isTodayMine = occ.date === todayIso && occ.assignedUserIds.includes(user?.id ?? '');
        // A shared turn (several people) doesn't get a single person's color — plain style.
        const style = occ.assignedUserIds.length === 1 ? personColors.get(occ.assignedUserIds[0]!) : undefined;
        return (
          <li
            key={`${occ.laundryTypeId}-${occ.date}`}
            className={
              isTodayMine
                ? `flex items-center justify-between rounded-2xl border-2 border-l-8 p-3 shadow-md ${style ? `${style.border} ${style.bg}` : 'border-slate-400 bg-slate-100 dark:border-slate-500 dark:bg-slate-700/40'}`
                : `flex items-center justify-between rounded-2xl border border-l-8 p-3 shadow-sm ${style ? `${style.border} ${style.bg}` : 'border-slate-200/70 bg-white dark:border-slate-700/70 dark:bg-slate-800'}`
            }
          >
            <span className="text-sm font-medium">
              <span className="capitalize">
                {formatOccurrenceDate(occ.date)}
                {occ.postponedFrom && (
                  <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                    (reporté depuis {formatOccurrenceDate(occ.postponedFrom)})
                  </span>
                )}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{occ.laundryTypeName}</span>
            </span>
            <span
              className={
                occ.done
                  ? 'text-sm text-slate-400 line-through dark:text-slate-500'
                  : style
                    ? `text-sm font-bold ${style.text}`
                    : 'text-sm text-slate-500 dark:text-slate-400'
              }
            >
              {occ.done
                ? 'Fait ✅'
                : isTodayMine
                  ? "🧺 C'est toi !"
                  : occ.assignedFirstNames.length > 0
                    ? occ.assignedFirstNames.join(' + ')
                    : '—'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function LaundryCard() {
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';
  const isTeen = user?.interfaceLevel === 'TEEN';
  const { parentModeEnabled } = useParentMode();
  // A parent or a TEEN-interface child gets full management rights here, gated by the same
  // "Mode gestion" toggle (Paramètres) either way — same as the meal plan, since "who does
  // the laundry" is the same kind of decision.
  const canEdit = isParent || isTeen;
  const showAdmin = canEdit && parentModeEnabled;
  const [view, setView] = useState<ViewMode>('week');
  const [editing, setEditing] = useState<LaundryTypeSummary | null | 'new'>(null);

  const upcoming = useLaundryUpcoming(VIEW_DAYS[view]);
  const types = useLaundryTypes();
  const members = useHouseholdRoster(showAdmin);
  const deleteType = useDeleteLaundryType();

  const activeMembers = (members.data ?? []).filter((m) => m.isActive);

  return (
    <section className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ménage</h2>
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

        {upcoming.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {upcoming.data && <UpcomingList occurrences={upcoming.data} />}
      </div>

      {canEdit && !parentModeEnabled && (
        <Link
          to="/settings"
          className="block rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Mode gestion désactivé — réactive-le dans les Paramètres pour gérer le ménage →
        </Link>
      )}

      {showAdmin && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Types de ménage</h3>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Ajouter
            </button>
          </div>

          {types.data && types.data.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Aucun type de ménage — ajoute-en un.
            </p>
          )}

          {types.data && types.data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {types.data.map((type) => (
                <li
                  key={type.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-800"
                >
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{scheduleLabel(type)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconButton label="Modifier" variant="brand" onClick={() => setEditing(type)}>
                      <PencilIcon />
                    </IconButton>
                    <IconButton label="Supprimer" variant="red" onClick={() => deleteType.mutate(type.id)}>
                      <TrashIcon />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && activeMembers.length > 0 && (
        <TypeEditorModal
          initial={editing === 'new' ? null : editing}
          members={activeMembers}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
