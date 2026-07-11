import { Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';

export function RootLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">
          Banque Familiale
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
