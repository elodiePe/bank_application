import { useEffect, useState } from 'react';

export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export interface BadgeContext {
  balanceCents: number;
  petStageIndex: number;
  streakDays: number;
  hasSavingsGoal: boolean;
  savingsGoalReached: boolean;
  allChoresDoneToday: boolean;
}

export const BADGE_DEFS: (BadgeDef & { check: (ctx: BadgeContext) => boolean })[] = [
  { id: 'first-save', emoji: '🌱', label: 'Première pièce', description: 'Avoir de l\'argent dans sa tirelire', check: (ctx) => ctx.balanceCents > 0 },
  { id: 'pet-stage-2', emoji: '🐣', label: 'Ça éclot !', description: 'Faire évoluer son compagnon', check: (ctx) => ctx.petStageIndex >= 1 },
  { id: 'pet-stage-4', emoji: '🐤', label: 'Grand voyage', description: 'Faire évoluer son compagnon 3 fois', check: (ctx) => ctx.petStageIndex >= 3 },
  { id: 'pet-stage-max', emoji: '🦚', label: 'Champion de l\'épargne', description: 'Faire évoluer son compagnon au maximum', check: (ctx) => ctx.petStageIndex >= 5 },
  { id: 'goal-set', emoji: '🎯', label: 'Rêveur', description: 'Créer un objectif d\'épargne', check: (ctx) => ctx.hasSavingsGoal },
  { id: 'goal-reached', emoji: '🏆', label: 'Objectif atteint', description: 'Atteindre son objectif d\'épargne', check: (ctx) => ctx.savingsGoalReached },
  { id: 'streak-3', emoji: '🔥', label: '3 jours de suite', description: "Venir voir l'appli 3 jours d'affilée", check: (ctx) => ctx.streakDays >= 3 },
  { id: 'streak-7', emoji: '⭐', label: 'Une semaine !', description: "Venir voir l'appli 7 jours d'affilée", check: (ctx) => ctx.streakDays >= 7 },
  { id: 'chores-done', emoji: '🧹', label: 'Journée parfaite', description: 'Faire toutes ses tâches du jour', check: (ctx) => ctx.allChoresDoneToday },
];

function storageKey(userId: string): string {
  return `unlocked-badges:${userId}`;
}

function readUnlocked(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Badges unlock permanently once earned (checked live against real data, then remembered
 * device-locally) so they never disappear just because a balance later drops — same
 * "achievement" feel as any game, without needing a backend to track it. */
export function useBadges(userId: string | undefined, ctx: BadgeContext) {
  const [unlocked, setUnlocked] = useState<Set<string>>(() => (userId ? readUnlocked(userId) : new Set()));
  const [newlyUnlocked, setNewlyUnlocked] = useState<BadgeDef | null>(null);

  useEffect(() => {
    if (!userId) return;
    const current = readUnlocked(userId);
    let firstNew: BadgeDef | null = null;
    for (const def of BADGE_DEFS) {
      if (!current.has(def.id) && def.check(ctx)) {
        current.add(def.id);
        if (!firstNew) firstNew = def;
      }
    }
    if (firstNew) {
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify([...current]));
      } catch {
        // Badge tracking is a nice-to-have — never worth breaking the UI over.
      }
      setUnlocked(new Set(current));
      setNewlyUnlocked(firstNew);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
    ctx.balanceCents,
    ctx.petStageIndex,
    ctx.streakDays,
    ctx.hasSavingsGoal,
    ctx.savingsGoalReached,
    ctx.allChoresDoneToday,
  ]);

  return {
    badges: BADGE_DEFS.map((def) => ({ ...def, unlocked: unlocked.has(def.id) })),
    newlyUnlocked,
    clearNewlyUnlocked: () => setNewlyUnlocked(null),
  };
}
