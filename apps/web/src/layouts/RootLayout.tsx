import { Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useLogout } from '../hooks/useLogout.js';

export function RootLayout() {
  const { theme, toggleTheme } = useTheme();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">
          Banque Familiale
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          {user && (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Déconnexion
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
