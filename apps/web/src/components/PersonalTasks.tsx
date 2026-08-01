import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PersonalTaskSummary } from '@banque-familiale/shared';
import { useCreatePersonalTask, useDeletePersonalTask, useUpdatePersonalTask } from '../hooks/usePersonalTasks.js';
import { tomorrowOf } from '../hooks/useWeeklyDuties.js';
import { formatTaskDate } from '../utils/taskDate.js';
import { Modal } from './Modal.js';
import { IconButton } from './IconButton.js';
import { TrashIcon } from './icons.js';
import { KebabMenu } from './KebabMenu.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** One self-created task, styled to match ChoreCard/DutyCard so it reads as just another item
 * in "Mes tâches" rather than a separate kind of thing. Postponing only makes sense for a
 * one-off task pinned to a `date` — a recurring one has no calendar date to push. */
export function PersonalTaskCard({ task, index }: { task: PersonalTaskSummary; index: number }) {
  const updateTask = useUpdatePersonalTask();
  const deleteTask = useDeletePersonalTask();
  const canPostpone = !task.recurring && !task.done && task.date !== null;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700"
    >
      <div>
        <p className={task.done ? 'font-medium line-through opacity-60' : 'font-medium'}>{task.title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {task.recurring ? 'Tous les jours' : task.date ? formatTaskDate(task.date) : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canPostpone && (
          <button
            type="button"
            onClick={() => updateTask.mutate({ id: task.id, input: { date: tomorrowOf(task.date!) } })}
            disabled={updateTask.isPending}
            className="hidden rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 sm:inline-flex"
          >
            Repousser
          </button>
        )}
        {task.done ? (
          <button
            type="button"
            onClick={() => updateTask.mutate({ id: task.id, input: { done: false } })}
            disabled={updateTask.isPending}
            className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
          >
            Annuler
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateTask.mutate({ id: task.id, input: { done: true } })}
            disabled={updateTask.isPending}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Fait !
          </button>
        )}
        <div className="hidden sm:block">
          <IconButton label="Supprimer" variant="red" onClick={() => deleteTask.mutate(task.id)}>
            <TrashIcon />
          </IconButton>
        </div>
        <div className="sm:hidden">
          <KebabMenu
            items={[
              ...(canPostpone
                ? [
                    {
                      label: 'Repousser',
                      onClick: () => updateTask.mutate({ id: task.id, input: { date: tomorrowOf(task.date!) } }),
                      disabled: updateTask.isPending,
                    },
                  ]
                : []),
              {
                label: 'Supprimer',
                onClick: () => deleteTask.mutate(task.id),
                variant: 'danger' as const,
                disabled: deleteTask.isPending,
              },
            ]}
          />
        </div>
      </div>
    </motion.li>
  );
}

/** Just the creation form — recurring or a specific day. Lives inside the small modal that
 * AddPersonalTaskButton opens; the tasks it creates show up directly in "Mes tâches" (via
 * PersonalTaskCard there), not in this modal. */
function AddTaskForm({ onAdded }: { onAdded: () => void }) {
  const createTask = useCreatePersonalTask();
  const [title, setTitle] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [date, setDate] = useState(todayIso());

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate(
      { title: trimmed, recurring, date: recurring ? undefined : date },
      { onSuccess: () => { setTitle(''); onAdded(); } },
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Nouvelle tâche…"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRecurring(true)}
          className={
            recurring
              ? 'flex-1 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
              : 'flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
          }
        >
          Récurrente
        </button>
        <button
          type="button"
          onClick={() => setRecurring(false)}
          className={
            !recurring
              ? 'flex-1 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
              : 'flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
          }
        >
          Un jour précis
        </button>
      </div>

      {recurring ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Revient chaque jour, à cocher à nouveau chaque fois.</p>
      ) : (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      )}

      <button
        type="button"
        onClick={submit}
        disabled={createTask.isPending || title.trim().length === 0}
        className="w-full rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
      >
        + Ajouter
      </button>
    </div>
  );
}

/** The creation modal on its own, open state controlled by the caller — lets the header's
 * mobile kebab menu open it as just another menu item, without needing its own trigger
 * button. */
export function AddPersonalTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Ajouter une tâche perso">
      <AddTaskForm onAdded={onClose} />
    </Modal>
  );
}

/** Just a button — opens a small modal to create a new personal task (recurring or for a
 * specific day). The task itself then shows up directly in "Mes tâches", not in this modal. */
export function AddPersonalTaskButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        + Tâche perso
      </button>

      <AddPersonalTaskModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
