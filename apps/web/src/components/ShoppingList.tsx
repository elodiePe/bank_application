import { useState, type FormEvent } from 'react';
import {
  useClearCheckedShoppingListItems,
  useCreateShoppingListItem,
  useDeleteShoppingListItem,
  useNotifyShoppingTrip,
  useSetShoppingListItemChecked,
  useShoppingList,
} from '../hooks/useShoppingList.js';
import { TrashIcon } from './icons.js';

export function ShoppingList() {
  const items = useShoppingList();
  const createItem = useCreateShoppingListItem();
  const setChecked = useSetShoppingListItemChecked();
  const deleteItem = useDeleteShoppingListItem();
  const notifyTrip = useNotifyShoppingTrip();
  const clearChecked = useClearCheckedShoppingListItems();
  const [label, setLabel] = useState('');
  const [tripSent, setTripSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    createItem.mutate({ label }, { onSuccess: () => setLabel('') });
  }

  function onNotifyTrip() {
    notifyTrip.mutate(undefined, {
      onSuccess: () => {
        setTripSent(true);
        setTimeout(() => setTripSent(false), 4000);
      },
    });
  }

  const checkedCount = items.data?.filter((item) => item.isChecked).length ?? 0;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Liste de courses</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onNotifyTrip}
          disabled={notifyTrip.isPending}
          className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          🛒 {tripSent ? 'Prévenu !' : 'Je vais faire les courses'}
        </button>
        <button
          type="button"
          onClick={() => clearChecked.mutate()}
          disabled={clearChecked.isPending || checkedCount === 0}
          className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          ✅ Courses finies
        </button>
      </div>

      <form onSubmit={onSubmit} className="mb-4 flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ajouter un article…"
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          disabled={createItem.isPending || !label.trim()}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>

      {items.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
      {items.isError && <p className="text-red-600 dark:text-red-400">Impossible de charger la liste.</p>}
      {items.data && items.data.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Liste vide pour le moment.
        </p>
      )}
      {items.data && items.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.data.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-800"
            >
              <label className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.isChecked}
                  onChange={(e) => setChecked.mutate({ id: item.id, isChecked: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
                />
                <span>
                  <span className={item.isChecked ? 'text-sm text-slate-400 line-through' : 'text-sm'}>
                    {item.label}
                  </span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    Ajouté par {item.addedByFirstName}
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => deleteItem.mutate(item.id)}
                aria-label="Supprimer"
                title="Supprimer"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-red-100 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
