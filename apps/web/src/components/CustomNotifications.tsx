import { useState } from 'react';
import { WEEKDAY_LABELS } from '@banque-familiale/shared';
import { useMembers } from '../hooks/useMembers.js';
import {
  useCreateCustomNotification,
  useCustomNotifications,
  useDeleteCustomNotification,
} from '../hooks/useCustomNotifications.js';
import { Modal } from './Modal.js';
import { IconButton } from './IconButton.js';
import { TrashIcon } from './icons.js';

type ScheduleMode = 'WEEKDAY' | 'DATE';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** ISO date of the next occurrence of `weekday` (0 = Monday .. 6 = Sunday) — today if it
 * already matches, otherwise the soonest one ahead. Only the weekday is ever read back out of
 * this date for a recurring notification, but a real date keeps the model (and its date-based
 * matching on the backend) identical for both modes. */
function nextDateForWeekday(weekday: number): string {
  const today = new Date();
  const todayWeekday = (today.getUTCDay() + 6) % 7;
  const diff = (weekday - todayWeekday + 7) % 7;
  const target = new Date(today);
  target.setUTCDate(today.getUTCDate() + diff);
  return target.toISOString().slice(0, 10);
}

function CreateNotificationModal({ onClose }: { onClose: () => void }) {
  const members = useMembers(true);
  const create = useCreateCustomNotification();
  const children = (members.data ?? []).filter((m) => m.role === 'CHILD' && m.isActive);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('WEEKDAY');
  const [weekday, setWeekday] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('08:00');
  const [sendToAll, setSendToAll] = useState(true);
  const [recipientUserIds, setRecipientUserIds] = useState<string[]>([]);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && time && (sendToAll || recipientUserIds.length > 0);

  function toggleRecipient(id: string) {
    setRecipientUserIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function submit() {
    if (!canSubmit) return;
    create.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        date: scheduleMode === 'WEEKDAY' ? nextDateForWeekday(weekday) : date,
        recurring: scheduleMode === 'WEEKDAY',
        time,
        sendToAll,
        recipientUserIds: sendToAll ? undefined : recipientUserIds,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Nouvelle notification">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="notif-title">
          Titre
        </label>
        <input
          id="notif-title"
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

        <label className="text-sm font-medium" htmlFor="notif-body">
          Message
        </label>
        <textarea
          id="notif-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

        <p className="mt-1 text-sm font-medium">Quand</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScheduleMode('WEEKDAY')}
            className={
              scheduleMode === 'WEEKDAY'
                ? 'flex-1 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white'
                : 'flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }
          >
            Jour de la semaine
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode('DATE')}
            className={
              scheduleMode === 'DATE'
                ? 'flex-1 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white'
                : 'flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }
          >
            Date précise
          </button>
        </div>

        {scheduleMode === 'WEEKDAY' ? (
          <>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setWeekday(day)}
                  className={
                    weekday === day
                      ? 'rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400'
                      : 'rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Envoyée chaque semaine, ce jour-là.</p>
          </>
        ) : (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        )}

        <label className="text-sm font-medium" htmlFor="notif-time">
          Heure
        </label>
        <input
          id="notif-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

        <p className="mt-1 text-sm font-medium">Destinataires</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSendToAll(true)}
            className={
              sendToAll
                ? 'flex-1 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white'
                : 'flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }
          >
            Toute la famille
          </button>
          <button
            type="button"
            onClick={() => setSendToAll(false)}
            className={
              !sendToAll
                ? 'flex-1 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white'
                : 'flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
            }
          >
            Certains enfants
          </button>
        </div>

        {!sendToAll && (
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => toggleRecipient(child.id)}
                className={
                  recipientUserIds.includes(child.id)
                    ? 'rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-400'
                    : 'rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30'
                }
              >
                {child.firstName}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={create.isPending || !canSubmit}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}

export function CustomNotifications() {
  const notifications = useCustomNotifications();
  const deleteNotification = useDeleteCustomNotification();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Envoie un rappel à un jour et une heure donnés, à toute la famille ou à certains enfants.</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="shrink-0 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          Ajouter
        </button>
      </div>

      {notifications.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
      {notifications.data && notifications.data.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Aucune notification programmée.
        </p>
      )}

      {notifications.data && notifications.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notifications.data.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-800"
            >
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{n.body}</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  <span className="capitalize">{formatDate(n.date)}</span> à {n.time}
                  {n.recurring && ' · toutes les semaines'} ·{' '}
                  {n.sendToAll ? 'toute la famille' : n.recipientFirstNames.join(', ')}
                </p>
              </div>
              <IconButton label="Supprimer" variant="red" onClick={() => deleteNotification.mutate(n.id)}>
                <TrashIcon />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateNotificationModal onClose={() => setCreating(false)} />}
    </div>
  );
}
