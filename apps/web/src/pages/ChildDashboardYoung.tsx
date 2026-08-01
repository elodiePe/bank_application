import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useChildOverview } from '../hooks/useDashboard.js';
import { useMyRequests } from '../hooks/useMoneyRequests.js';
import { useMyChores } from '../hooks/useChores.js';
import { useMySavingsGoal } from '../hooks/useSavingsGoal.js';
import { useVisitStreak } from '../hooks/useVisitStreak.js';
import { useBadges } from '../hooks/useBadges.js';
import { MoneyRequestList } from '../components/MoneyRequestList.js';
import { RequestMoneyModal } from '../components/RequestMoneyModal.js';
import { ChoreList } from '../components/ChoreList.js';
import { SavingsGoalCard } from '../components/SavingsGoalCard.js';
import { PetCompanion } from '../components/PetCompanion.js';
import { BadgeShelf } from '../components/BadgeShelf.js';
import { Confetti } from '../components/Confetti.js';

/** 6-8 ans : une seule page, très peu de choix. Le solde n'est plus juste un chiffre — c'est
 * un compagnon (PetCompanion) qui grandit avec l'épargne, les tâches deviennent des "quêtes du
 * jour", et des badges + une série de visites récompensent la régularité — pour rendre
 * "économiser et faire ses tâches" concret et amusant à cet âge plutôt qu'abstrait. Pas
 * d'onglets, pas d'actions boursières (trop complexe pour cet âge). */
export function ChildDashboardYoung() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const requests = useMyRequests();
  const chores = useMyChores();
  const savingsGoal = useMySavingsGoal();
  const streakDays = useVisitStreak(user?.id);
  const [requestOpen, setRequestOpen] = useState(false);
  const [petStageIndex, setPetStageIndex] = useState(0);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  const balanceCents = overview.data?.balanceCents ?? 0;
  const receivedPending = (requests.data ?? []).filter(
    (r) => r.status === 'PENDING' && r.targetUserId === user?.id,
  );
  const pendingChoreCount = (chores.data ?? []).filter(
    (c) => c.currentPeriodStatus === null || c.currentPeriodStatus === 'REJECTED',
  ).length;
  const hasPendingChores = pendingChoreCount > 0;
  const allChoresDoneToday = (chores.data?.length ?? 0) > 0 && !hasPendingChores;
  const savingsGoalReached = !!savingsGoal.data && balanceCents >= savingsGoal.data.targetCents;

  const { badges, newlyUnlocked } = useBadges(user?.id, {
    balanceCents,
    petStageIndex,
    streakDays,
    hasSavingsGoal: !!savingsGoal.data,
    savingsGoalReached,
    allChoresDoneToday,
  });

  // Fires a confetti burst whenever the pet levels up, a badge unlocks, or the child finishes
  // every quest for the day — three distinct little wins worth celebrating, not just one.
  const prevStageRef = useRef<number | null>(null);
  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    if (prevStageRef.current !== null && petStageIndex > prevStageRef.current) {
      setCelebrationTrigger((t) => t + 1);
    }
    prevStageRef.current = petStageIndex;
  }, [petStageIndex]);
  useEffect(() => {
    if (allChoresDoneToday && !prevAllDoneRef.current) {
      setCelebrationTrigger((t) => t + 1);
    }
    prevAllDoneRef.current = allChoresDoneToday;
  }, [allChoresDoneToday]);
  useEffect(() => {
    if (newlyUnlocked) setCelebrationTrigger((t) => t + 1);
  }, [newlyUnlocked]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-8 text-center">
      <Confetti trigger={celebrationTrigger} />

      <p className="text-2xl font-bold">Salut {user?.firstName} ! 👋</p>

      <PetCompanion
        balanceCents={balanceCents}
        hasPendingChores={hasPendingChores}
        streakDays={streakDays}
        userId={user?.id}
        onStageIndexChange={setPetStageIndex}
      />

      <button
        type="button"
        onClick={() => setRequestOpen(true)}
        className="w-full rounded-2xl bg-brand-600 py-5 text-xl font-bold text-white shadow-md hover:bg-brand-700"
      >
        💰 Faire une demande
      </button>

      {receivedPending.length > 0 && (
        <div className="w-full text-left">
          <h2 className="mb-2 text-lg font-semibold">📣 On te demande quelque chose !</h2>
          {user && (
            <MoneyRequestList
              requests={receivedPending}
              viewerId={user.id}
              viewerRole="CHILD"
              emptyLabel=""
            />
          )}
        </div>
      )}

      {/* Everything below is secondary to the core loop (compagnon + demande) — tucked behind
          one tap so the page doesn't dump badges/objectif/quêtes on a 6-8 ans all at once. The
          pending-quest count on the button itself is the cue that there's something to open. */}
      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/20"
      >
        {moreOpen ? '🔼 Voir moins' : '✨ Mes quêtes, mon objectif et mes badges'}
        {!moreOpen && hasPendingChores && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
            {pendingChoreCount}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex w-full flex-col gap-6 overflow-hidden"
          >
            {chores.data && chores.data.length > 0 && (
              <div className="w-full text-left">
                <h2 className="mb-2 text-lg font-semibold">🗺️ Tes quêtes du jour</h2>
                {allChoresDoneToday && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-2 rounded-xl bg-emerald-100 p-4 text-center font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    🎉 Bravo, toutes tes quêtes sont terminées !
                  </motion.p>
                )}
                <ChoreList chores={chores.data} emptyLabel="" />
              </div>
            )}

            <div className="w-full text-left">
              <SavingsGoalCard balanceCents={balanceCents} />
            </div>

            <BadgeShelf badges={badges} />
          </motion.div>
        )}
      </AnimatePresence>

      {requestOpen && overview.data && (
        <RequestMoneyModal siblings={overview.data.siblings} onClose={() => setRequestOpen(false)} />
      )}
    </div>
  );
}
