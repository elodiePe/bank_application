import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isUnauthenticatedError, useCurrentUser } from '../hooks/useAuth.js';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isFetching, isError, error } = useCurrentUser();

  // Wait for any in-flight fetch (initial load, or the refetch triggered right after
  // login/logout invalidates the cache) before deciding — otherwise we can briefly see
  // stale "unauthenticated" state from before the fetch and redirect incorrectly.
  if (!data && isFetching) {
    return <p className="p-6 text-center">Chargement…</p>;
  }

  if (!data) {
    if (isError && !isUnauthenticatedError(error)) {
      return (
        <p className="p-6 text-center text-red-600 dark:text-red-400">
          Impossible de contacter le serveur.
        </p>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
