import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useLogout } from '../hooks/useLogout.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { useTrackShortcutUsage } from '../hooks/useShortcutUsage.js';
import { BottomNav } from '../components/BottomNav.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { NotificationBell } from '../components/NotificationBell.js';
import { LogoutIcon } from '../components/icons.js';

const NAV_SECTIONS = [
  { to: '/home', label: 'Accueil' },
  { to: '/dashboard', label: 'Argent' },
  { to: '/chores', label: 'Maison' },
  { to: '/settings', label: 'Paramètres' },
];

// One standard background for the whole app — previously each section had its own tint,
// which made the app feel inconsistent rather than helping orientation.
const APP_BACKGROUND = 'bg-slate-50 dark:bg-slate-950';

export function RootLayout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { pathname } = useLocation();
  // The YOUNG tier has no navigation of its own — a single page covers everything.
  const hasNav = user?.interfaceLevel !== 'YOUNG';
  // First parent only: funnel them into the setup wizard until it's done, regardless of
  // which URL they land on (covers a reload/close mid-wizard, not just the initial redirect).
  const overview = useParentOverview(user?.role === 'PARENT');
  useTrackShortcutUsage(user?.id);

  if (user?.role === 'PARENT' && overview.data && !overview.data.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className={`min-h-screen ${APP_BACKGROUND} text-slate-900 transition-colors duration-300 dark:text-slate-50`}>
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200/60 bg-slate-50/90 px-3 py-3 backdrop-blur-sm sm:px-6 sm:py-4 dark:border-slate-700/60 dark:bg-slate-950/90">
        <Link
          to="/"
          className="truncate text-base font-semibold text-brand-600 sm:text-lg dark:text-brand-400"
        >
          Banque Familiale
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {user && <NotificationBell />}

          {/* Desktop: individual labeled buttons — the mobile-only BottomNav covers the
              same 4 sections on small screens instead. */}
          {user &&
            hasNav &&
            NAV_SECTIONS.map((section) => {
              const isActive = pathname === section.to;
              return (
                <Link
                  key={section.to}
                  to={section.to}
                  aria-label={section.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'hidden items-center rounded-full border border-brand-600 bg-brand-600 px-3 py-1 text-sm text-white sm:flex dark:border-brand-500 dark:bg-brand-500'
                      : 'hidden items-center rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 sm:flex dark:border-slate-700 dark:hover:bg-slate-900'
                  }
                >
                  {section.label}
                </Link>
              );
            })}
          {user && (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Déconnexion"
              className="hidden items-center rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-60 sm:flex dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Déconnexion
            </button>
          )}

          {/* Mobile: no overflow menu — a direct logout button instead. Theme lives in Paramètres. */}
          {user && (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Déconnexion"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-60 sm:hidden dark:hover:bg-slate-800"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6 sm:py-10 sm:pb-10">
        <Breadcrumb />
        <Outlet />
      </main>
      {user && hasNav && <BottomNav />}
    </div>
  );
}
