import { useCurrentUser } from '../hooks/useAuth.js';
import { useSetShowPointsBalance } from '../hooks/useMembers.js';

/** TEEN-only self-service preference: whether this child's own points count is shown on
 * their dashboard (Argent + Corvées). Not offered to YOUNG/MIDDLE, who keep the default. */
export function PointsVisibilitySetting() {
  const { data: user } = useCurrentUser();
  const setShowPointsBalance = useSetShowPointsBalance();
  const show = user?.showPointsBalance ?? true;

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <span className="text-sm font-medium">Afficher mes points</span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Montre ou masque le nombre de points sur ton tableau de bord.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShowPointsBalance.mutate({ show: !show })}
        disabled={setShowPointsBalance.isPending}
        aria-pressed={show}
        aria-label="Afficher mes points"
        className="flex shrink-0 items-center disabled:opacity-60"
      >
        <span
          className={
            show
              ? 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-brand-600 transition-colors dark:bg-brand-500'
              : 'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-slate-300 transition-colors dark:bg-slate-600'
          }
        >
          <span
            className={
              show
                ? 'inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white transition-transform'
                : 'inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white transition-transform'
            }
          />
        </span>
      </button>
    </div>
  );
}
