import { Link, useLocation } from 'react-router-dom';

const PAGE_LABELS: Record<string, string> = {
  '/history': 'Historique',
  '/portfolio': 'Portefeuille',
};

export function Breadcrumb() {
  const { pathname } = useLocation();
  const label = PAGE_LABELS[pathname];

  if (!label) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 flex items-center gap-1.5 text-sm">
      <Link to="/dashboard" className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
        Tableau de bord
      </Link>
      <span className="text-slate-400 dark:text-slate-600" aria-hidden>
        /
      </span>
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </nav>
  );
}
