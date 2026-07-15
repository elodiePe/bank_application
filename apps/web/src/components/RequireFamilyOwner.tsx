import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isFamilyUnauthenticatedError, useCurrentFamily } from '../hooks/useFamilyAuth.js';

export function RequireFamilyOwner({ children }: { children: ReactNode }) {
  const { data, isFetching, isError, error } = useCurrentFamily();

  if (!data && isFetching) {
    return <p className="p-6 text-center">Chargement…</p>;
  }

  if (!data) {
    if (isError && !isFamilyUnauthenticatedError(error)) {
      return (
        <p className="p-6 text-center text-red-600 dark:text-red-400">
          Impossible de contacter le serveur.
        </p>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
