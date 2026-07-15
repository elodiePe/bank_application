import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { requestPasswordResetSchema, type RequestPasswordResetInput } from '@banque-familiale/shared';
import { useRequestFamilyPasswordReset } from '../hooks/useFamilyAuth.js';

export function ForgotFamilyPasswordPage() {
  const requestReset = useRequestFamilyPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  if (requestReset.isSuccess) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d'être envoyé.
        </p>
        <Link to="/family-login" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          ← Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mot de passe oublié</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => requestReset.mutate(values))}
        className="flex w-full flex-col gap-3"
      >
        <label className="text-sm font-medium" htmlFor="ownerEmail">
          E-mail du compte famille
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

        <button
          type="submit"
          disabled={requestReset.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {requestReset.isPending ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
        </button>
      </form>

      <Link to="/family-login" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Retour à la connexion
      </Link>
    </div>
  );
}
