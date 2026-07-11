import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/health.service.js';

export function HomePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fondations du monorepo</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Cette page confirme que le frontend, le backend et le package partagé communiquent
        correctement.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading && <p>Connexion à l'API…</p>}
        {isError && (
          <p className="text-red-600 dark:text-red-400">
            Erreur de connexion à l'API : {error instanceof Error ? error.message : 'inconnue'}
          </p>
        )}
        {data && (
          <p className="text-emerald-600 dark:text-emerald-400">
            API status: <strong>{data.status}</strong> — {data.timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
