import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerFamilySchema, type RegisterFamilyInput } from '@banque-familiale/shared';
import { useRegisterFamily } from '../hooks/useFamilyAuth.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: 'Une famille existe déjà avec cette adresse e-mail.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives, réessayez plus tard.',
};

export function RegisterFamilyPage() {
  const navigate = useNavigate();
  const registerFamily = useRegisterFamily();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFamilyInput>({ resolver: zodResolver(registerFamilySchema) });

  function onSubmit(values: RegisterFamilyInput) {
    registerFamily.mutate(values, { onSuccess: () => navigate('/login', { replace: true }) });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Créer votre famille</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Un compte pour gérer l'ensemble de votre famille.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="familyName">
          Nom de la famille
        </label>
        <input
          id="familyName"
          type="text"
          autoFocus
          {...register('familyName')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
        {errors.familyName && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.familyName.message}</p>
        )}

        <label className="text-sm font-medium" htmlFor="ownerEmail">
          Votre e-mail
        </label>
        <input
          id="ownerEmail"
          type="email"
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
          autoComplete="new-password"
          {...register('ownerPassword')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
        {errors.ownerPassword && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.ownerPassword.message}</p>
        )}

        {registerFamily.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {registerFamily.error instanceof ApiError
              ? (ERROR_MESSAGES[registerFamily.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={registerFamily.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {registerFamily.isPending ? 'Création…' : 'Créer votre famille'}
        </button>
      </form>

      <div className="flex flex-col items-center gap-1 text-sm">
        <Link to="/family-login" className="text-brand-600 hover:underline dark:text-brand-400">
          Vous avez déjà un compte ? Se connecter
        </Link>
        <Link to="/" className="text-slate-500 hover:underline dark:text-slate-400">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
