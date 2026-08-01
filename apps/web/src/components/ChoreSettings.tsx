import { useState } from 'react';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { CHORE_RECURRENCE_LABELS } from '@banque-familiale/shared';
import { useDeleteChore, useFamilyChores, useUpdateChore } from '../hooks/useChores.js';
import { AddChoreModal } from './AddChoreModal.js';
import { formatChoreReward } from '../utils/chore.js';
import { IconButton } from './IconButton.js';
import { TrashIcon } from './icons.js';

export function ChoreSettings({ children }: { children: ChildBalanceSummary[] }) {
  const chores = useFamilyChores();
  const updateChore = useUpdateChore();
  const deleteChore = useDeleteChore();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          L'enfant marque une tâche comme faite, un parent valide pour verser la récompense.
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          + Ajouter
        </button>
      </div>

      <div className="p-4">
        {chores.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>}
        {chores.data && chores.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune tâche pour le moment.
          </p>
        )}

        {chores.data && chores.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {chores.data.map((chore) => (
              <li
                key={chore.id}
                className={
                  chore.active
                    ? 'flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60'
                    : 'flex items-center justify-between rounded-xl bg-slate-50/60 p-3 opacity-60 dark:bg-slate-900/30'
                }
              >
                <div className="flex items-center gap-3">
                  <span aria-hidden className="text-lg">
                    {chore.rewardType === 'POINTS' ? '⭐' : '💰'}
                  </span>
                  <div>
                    <p className={chore.active ? 'text-sm font-medium' : 'text-sm font-medium line-through'}>
                      {chore.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {chore.childFirstName} · {CHORE_RECURRENCE_LABELS[chore.recurrence]} ·{' '}
                      {formatChoreReward(chore)} · {chore.requiresApproval ? 'validation requise' : 'auto-validée'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateChore.mutate({ choreId: chore.id, input: { requiresApproval: !chore.requiresApproval } })
                    }
                    disabled={updateChore.isPending}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {chore.requiresApproval ? 'Rendre auto-validée' : 'Exiger une validation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChore.mutate({ choreId: chore.id, input: { active: !chore.active } })}
                    disabled={updateChore.isPending}
                    className={
                      chore.active
                        ? 'rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                        : 'rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-200 disabled:opacity-60 dark:bg-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-900/70'
                    }
                  >
                    {chore.active ? 'Désactiver' : 'Réactiver'}
                  </button>
                  <IconButton
                    label="Supprimer"
                    variant="red"
                    onClick={() => deleteChore.mutate(chore.id)}
                  >
                    <TrashIcon />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {addOpen && <AddChoreModal children={children} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
