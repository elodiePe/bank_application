import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginFamilySchema, verifyOwnerMfaSchema, type LoginFamilyInput, type VerifyOwnerMfaInput } from '@banque-familiale/shared';
import { useLoginFamily, useVerifyOwnerMfa } from '../hooks/useFamilyAuth.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Aucune famille ne correspond à cet e-mail.',
  INVALID_CREDENTIAL: 'E-mail ou mot de passe incorrect.',
  LOCKED: 'Compte verrouillé après plusieurs échecs. Réessayez dans 15 minutes.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives, réessayez plus tard.',
};

const MFA_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: 'Code incorrect.',
  EXPIRED: 'Ce code a expiré ou a déjà été utilisé. Reconnectez-vous pour en recevoir un nouveau.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives, réessayez plus tard.',
};

export function FamilyLoginPage() {
  const navigate = useNavigate();
  const loginFamily = useLoginFamily();
  const verifyMfa = useVerifyOwnerMfa();
  const [challenge, setChallenge] = useState<{ familyId: string; devCode?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFamilyInput>({ resolver: zodResolver(loginFamilySchema) });

  const {
    register: registerCode,
    handleSubmit: handleSubmitCode,
    formState: { errors: codeErrors },
  } = useForm<Pick<VerifyOwnerMfaInput, 'code'>>({
    resolver: zodResolver(verifyOwnerMfaSchema.pick({ code: true })),
  });

  function onSubmit(values: LoginFamilyInput) {
    loginFamily.mutate(values, {
      onSuccess: (res) => setChallenge({ familyId: res.familyId, devCode: res.devCode }),
    });
  }

  function onSubmitCode(values: Pick<VerifyOwnerMfaInput, 'code'>) {
    if (!challenge) return;
    verifyMfa.mutate(
      { familyId: challenge.familyId, code: values.code },
      { onSuccess: () => navigate('/login', { replace: true }) },
    );
  }

  if (challenge) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">FamilyApp</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Un code à 6 chiffres vient de vous être envoyé par e-mail.
          </p>
        </div>

        <form onSubmit={handleSubmitCode(onSubmitCode)} className="flex w-full flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="code">
            Code de connexion
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            defaultValue={challenge.devCode}
            {...registerCode('code')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg tracking-[0.3em] dark:border-slate-700 dark:bg-slate-800"
          />
          {codeErrors.code && <p className="text-sm text-red-600 dark:text-red-400">{codeErrors.code.message}</p>}

          {verifyMfa.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {verifyMfa.error instanceof ApiError
                ? (MFA_ERROR_MESSAGES[verifyMfa.error.code] ?? 'Une erreur est survenue.')
                : 'Une erreur est survenue.'}
            </p>
          )}

          <button
            type="submit"
            disabled={verifyMfa.isPending}
            className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {verifyMfa.isPending ? 'Vérification…' : 'Valider'}
          </button>
          <button type="button" onClick={() => setChallenge(null)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Revenir à la connexion
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">FamilyApp</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Se connecter à votre famille</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="ownerEmail">
          E-mail
        </label>
        <input
          id="ownerEmail"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
          {...register('ownerEmail')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {errors.ownerEmail && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.ownerEmail.message}</p>
        )}

        <label className="text-sm font-medium" htmlFor="ownerPassword">
          Mot de passe
        </label>
        <input
          id="ownerPassword"
          type="password"
          autoComplete="current-password"
          {...register('ownerPassword')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {errors.ownerPassword && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.ownerPassword.message}</p>
        )}
        <Link
          to="/forgot-password"
          className="self-end text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          Mot de passe oublié ?
        </Link>

        {loginFamily.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {loginFamily.error instanceof ApiError
              ? (ERROR_MESSAGES[loginFamily.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={loginFamily.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loginFamily.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div className="flex flex-col items-center gap-1 text-sm">
        <Link to="/register" className="text-brand-600 hover:underline dark:text-brand-400">
          Pas encore de famille ? En créer une
        </Link>
        <Link to="/" className="text-slate-500 hover:underline dark:text-slate-400">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
