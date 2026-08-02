import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useMyRequests, usePendingRequests } from '../hooks/useMoneyRequests.js';
import { usePendingDisputes } from '../hooks/useDisputes.js';
import { usePendingChoreCompletions } from '../hooks/useChores.js';

const LINK_CLASS =
  'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-slate-500 dark:text-slate-400';
const ACTIVE_LINK_CLASS = 'text-brand-600 dark:text-brand-400';

// The chip behind each icon is the active/inactive signal — a filled, tinted circle when
// that section is the current page, a plain neutral one otherwise — since color alone on
// small text labels was easy to miss at a glance.
const CHIP_CLASS = 'flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors';
const CHIP_ACTIVE_CLASS = 'bg-brand-600 dark:bg-brand-500';
const CHIP_INACTIVE_CLASS = 'bg-slate-100 dark:bg-slate-700';

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NavIcon({ icon, isActive, badgeCount }: { icon: string; isActive: boolean; badgeCount: number }) {
  return (
    <span className="relative">
      <span aria-hidden className={`${CHIP_CLASS} ${isActive ? CHIP_ACTIVE_CLASS : CHIP_INACTIVE_CLASS}`}>
        {icon}
      </span>
      <Badge count={badgeCount} />
    </span>
  );
}

/** Mobile-only bottom tab bar (hidden on desktop, where the same 4 sections are reachable
 * from the header instead). Not rendered for a YOUNG child, who has no navigation of
 * their own — RootLayout gates on that. */
export function BottomNav() {
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';

  // Each of these four endpoints is restricted to one role — calling the wrong one for the
  // current account always 403s (and TanStack Query then burns 3 retries on it), so each is
  // only enabled once we actually know the role (not just while `user` is still loading, when
  // `isParent` is false by default and would wrongly enable the child-only endpoint).
  const pendingRequests = usePendingRequests(!!user && isParent);
  const myRequests = useMyRequests(!!user && !isParent);
  const pendingDisputes = usePendingDisputes(!!user && isParent);
  const pendingChoreCompletions = usePendingChoreCompletions(!!user && isParent);

  // Every "waiting on you" count (money requests, disputes, and chore validations) shows on
  // Accueil, where they're all actually handled — Maison itself has nothing left to badge.
  const homeBadge = isParent
    ? (pendingRequests.data?.length ?? 0) +
      (pendingDisputes.data?.length ?? 0) +
      (pendingChoreCompletions.data?.length ?? 0)
    : (myRequests.data?.filter((r) => r.status === 'PENDING' && r.targetUserId === user?.id).length ?? 0);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-slate-700 dark:bg-slate-800">
      <NavLink to="/home" className={({ isActive }) => `${LINK_CLASS} ${isActive ? ACTIVE_LINK_CLASS : ''}`}>
        {({ isActive }) => (
          <>
            <NavIcon icon="📊" isActive={isActive} badgeCount={homeBadge} />
            Dashboard
          </>
        )}
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => `${LINK_CLASS} ${isActive ? ACTIVE_LINK_CLASS : ''}`}>
        {({ isActive }) => (
          <>
            <NavIcon icon="💰" isActive={isActive} badgeCount={0} />
            Argent
          </>
        )}
      </NavLink>
      <NavLink to="/chores" className={({ isActive }) => `${LINK_CLASS} ${isActive ? ACTIVE_LINK_CLASS : ''}`}>
        {({ isActive }) => (
          <>
            <NavIcon icon="🏠" isActive={isActive} badgeCount={0} />
            Maison
          </>
        )}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `${LINK_CLASS} ${isActive ? ACTIVE_LINK_CLASS : ''}`}>
        {({ isActive }) => (
          <>
            <NavIcon icon="⚙️" isActive={isActive} badgeCount={0} />
            Paramètres
          </>
        )}
      </NavLink>
    </nav>
  );
}
