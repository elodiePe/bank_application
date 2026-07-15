import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_FAMILY_QUERY_KEY } from '../hooks/useFamilyAuth.js';
import { verifyEmail } from '../services/familyAuth.service.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "Ce lien de confirmation n'est plus valide ou a expiré.",
  NOT_FOUND: 'Ce compte famille est introuvable.',
};

type Status = 'pending' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const queryClient = useQueryClient();
  const attempted = useRef(false);
  const [status, setStatus] = useState<Status>('pending');
  const [errorMessage, setErrorMessage] = useState('Une erreur est survenue.');

  useEffect(() => {
    if (attempted.current || !token) return;
    attempted.current = true;

    verifyEmail({ token })
      .then(() => {
        setStatus('success');
        void queryClient.invalidateQueries({ queryKey: CURRENT_FAMILY_QUERY_KEY });
      })
      .catch((error: unknown) => {
        setStatus('error');
        if (error instanceof ApiError) {
          setErrorMessage(ERROR_MESSAGES[error.code] ?? 'Une erreur est survenue.');
        }
      });
  }, [token, queryClient]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>

      {!token && <p className="text-red-600 dark:text-red-400">Lien de confirmation invalide.</p>}

      {token && status === 'pending' && (
        <p className="text-slate-500 dark:text-slate-400">Confirmation en cours…</p>
      )}

      {token && status === 'success' && (
        <>
          <p className="text-green-600 dark:text-green-400">Votre adresse e-mail a bien été confirmée.</p>
          <Link to="/login" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Continuer vers la connexion
          </Link>
        </>
      )}

      {token && status === 'error' && <p className="text-red-600 dark:text-red-400">{errorMessage}</p>}
    </div>
  );
}
