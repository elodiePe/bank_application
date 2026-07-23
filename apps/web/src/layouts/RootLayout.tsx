import { Link, Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useLogout } from '../hooks/useLogout.js';
import { NotificationBell } from '../components/NotificationBell.js';
import { HeaderOverflowMenu } from '../components/HeaderOverflowMenu.js';

export function RootLayout() {
  const { theme, toggleTheme } = useTheme();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
        <Link
          to="/"
          className="truncate text-base font-semibold text-brand-600 sm:text-lg dark:text-brand-400"
        >
          Banque Familiale
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {user && <NotificationBell />}

          {/* Desktop: individual labeled buttons. */}
          {user && (
            <Link
              to="/settings"
              aria-label="Paramètres"
              className="hidden items-center rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 sm:flex dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Paramètres
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            className="hidden items-center rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 sm:flex dark:border-slate-700 dark:hover:bg-slate-900"
          >
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
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

          {/* Mobile: collapsed into a single overflow menu. */}
          <div className="sm:hidden">
            <HeaderOverflowMenu
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogout={() => logout.mutate()}
              logoutPending={logout.isPending}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
