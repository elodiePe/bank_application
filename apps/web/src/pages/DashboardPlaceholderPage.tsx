import { useCurrentUser } from '../hooks/useAuth.js';

const ROLE_LABEL: Record<string, string> = { PARENT: 'Parent', CHILD: 'Enfant' };

export function DashboardPlaceholderPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bienvenue{user ? `, ${user.firstName}` : ''} 👋</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Connecté en tant que <strong>{user?.role ? ROLE_LABEL[user.role] : ''}</strong>.
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          Le tableau de bord {user?.role === 'PARENT' ? 'parent' : 'enfant'} arrive à l'étape
          suivante.
        </p>
      </div>
    </div>
  );
}
