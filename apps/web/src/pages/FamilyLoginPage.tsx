import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginFamilySchema, type LoginFamilyInput } from '@banque-familiale/shared';
import { useLoginFamily } from '../hooks/useFamilyAuth.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Aucune famille ne correspond à cet e-mail.',
  INVALID_CREDENTIAL: 'E-mail ou mot de passe incorrect.',
  LOCKED: 'Compte verrouillé après plusieurs échecs. Réessayez dans 15 minutes.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives, réessayez plus tard.',
};

export function FamilyLoginPage() {
  const navigate = useNavigate();
  const loginFamily = useLoginFamily();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFamilyInput>({ resolver: zodResolver(loginFamilySchema) });

  function onSubmit(values: LoginFamilyInput) {
    loginFamily.mutate(values, { onSuccess: () => navigate('/login', { replace: true }) });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Se connecter à votre famille</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="ownerEmail">
          E-mail
        </label>
        <input
          id="ownerEmail"
          type="email"
          autoFocus
          {...register('ownerEmail')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
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
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
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
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
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
