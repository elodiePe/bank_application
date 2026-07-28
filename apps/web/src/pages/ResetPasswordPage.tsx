import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import {
  confirmMemberPinResetSchema,
  confirmPasswordResetSchema,
  type ConfirmMemberPinResetInput,
  type ConfirmPasswordResetInput,
} from '@banque-familiale/shared';
import { useConfirmFamilyPasswordReset } from '../hooks/useFamilyAuth.js';
import { useConfirmMemberPinReset } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Ce lien de réinitialisation n'est plus valide ou a expiré.",
  NOT_FOUND: 'Ce compte est introuvable.',
};

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
      <p className="text-slate-600 dark:text-slate-300">{message}</p>
      <Link to="/family-login" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        Se connecter
      </Link>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
      <p className="text-red-600 dark:text-red-400">Lien de réinitialisation invalide.</p>
    </div>
  );
}

function FamilyPasswordResetForm({ token }: { token: string }) {
  const confirmReset = useConfirmFamilyPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmPasswordResetInput>({
    resolver: zodResolver(confirmPasswordResetSchema),
    defaultValues: { token },
  });

  if (confirmReset.isSuccess) {
    return <SuccessMessage message="Ton mot de passe a été réinitialisé avec succès." />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choisir un nouveau mot de passe</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => confirmReset.mutate(values))}
        className="flex w-full flex-col gap-3"
      >
        <input type="hidden" {...register('token')} value={token} />
        <label className="text-sm font-medium" htmlFor="newPassword">
          Nouveau mot de passe
        </label>
        <input
          id="newPassword"
          type="password"
          autoFocus
          autoComplete="new-password"
          {...register('newPassword')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {errors.newPassword && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.newPassword.message}</p>
        )}

        {confirmReset.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {confirmReset.error instanceof ApiError
              ? (ERROR_MESSAGES[confirmReset.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={confirmReset.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {confirmReset.isPending ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  );
}

function MemberPinResetForm({ token }: { token: string }) {
  const confirmReset = useConfirmMemberPinReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmMemberPinResetInput>({
    resolver: zodResolver(confirmMemberPinResetSchema),
    defaultValues: { token },
  });

  if (confirmReset.isSuccess) {
    return <SuccessMessage message="Ton code PIN a été réinitialisé avec succès." />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choisir un nouveau code PIN</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => confirmReset.mutate(values))}
        className="flex w-full flex-col gap-3"
      >
        <input type="hidden" {...register('token')} value={token} />
        <label className="text-sm font-medium" htmlFor="newPin">
          Nouveau code PIN (4 chiffres)
        </label>
        <input
          id="newPin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          {...register('newPin')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {errors.newPin && <p className="text-sm text-red-600 dark:text-red-400">{errors.newPin.message}</p>}

        {confirmReset.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {confirmReset.error instanceof ApiError
              ? (ERROR_MESSAGES[confirmReset.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={confirmReset.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {confirmReset.isPending ? 'Enregistrement…' : 'Réinitialiser le code PIN'}
        </button>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const type = searchParams.get('type') === 'member' ? 'member' : 'family';

  if (!token) return <InvalidLink />;

  return type === 'member' ? <MemberPinResetForm token={token} /> : <FamilyPasswordResetForm token={token} />;
}
