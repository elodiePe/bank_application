import { useCurrentUser } from '../hooks/useAuth.js';

export function ChildDashboardPlaceholderPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bienvenue{user ? `, ${user.firstName}` : ''} 👋</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Ton tableau de bord (solde, demandes, historique) arrive à une prochaine étape.
        </p>
      </div>
    </div>
  );
}
