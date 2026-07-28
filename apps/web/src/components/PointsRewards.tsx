import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useChildOverview } from '../hooks/useDashboard.js';
import { useCreatePointsReward, useDeletePointsReward, usePointsRewards } from '../hooks/usePointsRewards.js';
import { TrashIcon } from './icons.js';

/** Child-facing points banner — same gradient-card treatment as the Argent balance banner —
 * plus how many points are left until this child's own next reward tier. */
export function ChildPointsSummary() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const rewards = usePointsRewards();
  const points = overview.data?.pointsBalance ?? 0;
  const myRewards = (rewards.data ?? []).filter((r) => r.childUserId === user?.id);
  const nextReward = myRewards.slice().sort((a, b) => a.pointsRequired - b.pointsRequired).find((r) => r.pointsRequired > points);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 p-8 text-center text-white shadow-md"
    >
      <p className="text-sm text-amber-100">Mes points</p>
      <p className="mt-1 text-4xl font-bold">⭐ {points}</p>
      {nextReward && (
        <p className="mt-3 text-sm text-amber-100">
          Encore {nextReward.pointsRequired - points} points pour « {nextReward.title} »
        </p>
      )}
      {!nextReward && myRewards.length > 0 && (
        <p className="mt-3 text-sm text-amber-100">Toutes les récompenses sont débloquées !</p>
      )}
    </motion.div>
  );
}

/** Parent-facing management of each child's own points-reward ladder — one child selected at a
 * time, since siblings rarely want the same rewards at the same thresholds. */
export function PointsRewardManager({ children }: { children: ChildBalanceSummary[] }) {
  const rewards = usePointsRewards();
  const createReward = useCreatePointsReward();
  const deleteReward = useDeletePointsReward();
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.userId ?? '');
  const [title, setTitle] = useState('');
  const [pointsRequired, setPointsRequired] = useState('');

  if (children.length === 0) return null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const points = Number(pointsRequired);
    if (!title.trim() || !Number.isInteger(points) || points <= 0 || !selectedChildId) return;
    createReward.mutate(
      { childUserId: selectedChildId, title, pointsRequired: points },
      { onSuccess: () => { setTitle(''); setPointsRequired(''); } },
    );
  }

  const childRewards = (rewards.data ?? [])
    .filter((r) => r.childUserId === selectedChildId)
    .sort((a, b) => a.pointsRequired - b.pointsRequired);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Récompenses en points</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Un objectif de points par enfant — chacun a sa propre échelle.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto p-4 pb-0">
        {children.map((child) => (
          <button
            key={child.userId}
            type="button"
            onClick={() => setSelectedChildId(child.userId)}
            aria-current={selectedChildId === child.userId ? 'page' : undefined}
            className={
              selectedChildId === child.userId
                ? 'shrink-0 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white dark:bg-brand-500'
                : 'shrink-0 rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
            }
          >
            {child.firstName}
          </button>
        ))}
      </div>

      <div className="p-4">
        <form onSubmit={onSubmit} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Choisir le dessert"
            className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="number"
            min={1}
            step={1}
            value={pointsRequired}
            onChange={(e) => setPointsRequired(e.target.value)}
            placeholder="Points"
            className="w-24 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={createReward.isPending}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>

        {childRewards.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune récompense définie pour l'instant.
          </p>
        )}
        {childRewards.length > 0 && (
          <ul className="flex flex-col gap-2">
            {childRewards.map((reward) => (
              <li
                key={reward.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60"
              >
                <span className="text-sm font-medium">
                  {reward.title} <span className="text-slate-400 dark:text-slate-500">· {reward.pointsRequired} pts</span>
                </span>
                <button
                  type="button"
                  onClick={() => deleteReward.mutate(reward.id)}
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
      </div>
    </section>
  );
}
