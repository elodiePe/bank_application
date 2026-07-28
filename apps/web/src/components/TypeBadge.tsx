/** Small uppercase pill labeling what kind of card this is (Corvée, Signalement, a money
 * request type…) — needed once several different card types started sharing one list (e.g.
 * Accueil's merged "Demandes en attente"), since the content alone no longer makes it obvious. */
export function TypeBadge({ children }: { children: string }) {
  return (
    <span className="mb-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      {children}
    </span>
  );
}
