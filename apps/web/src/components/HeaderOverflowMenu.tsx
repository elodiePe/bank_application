import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface HeaderOverflowMenuProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  logoutPending: boolean;
}

/// Mobile-only "..." overflow menu — collapses the header's secondary actions (settings,
/// theme, logout) behind a single button so the header stays uncluttered on narrow screens.
/// Desktop keeps the actions as individual buttons, so this component is never rendered there.
export function HeaderOverflowMenu({ theme, onToggleTheme, onLogout, logoutPending }: HeaderOverflowMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        ⋮
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <Link
                to="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span aria-hidden>⚙️</span>
                Paramètres
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleTheme();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
                disabled={logoutPending}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
              >
                <span aria-hidden>🚪</span>
                Déconnexion
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
