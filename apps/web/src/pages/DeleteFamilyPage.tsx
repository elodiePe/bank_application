import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmAccountDeletionSchema, type ConfirmAccountDeletionInput } from '@banque-familiale/shared';
import { useConfirmAccountDeletion } from '../hooks/useFamilyAuth.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "Ce lien de confirmation n'est plus valide ou a expiré.",
  NOT_FOUND: 'Ce compte famille est introuvable.',
  INVALID_CREDENTIAL: 'Mot de passe incorrect.',
};

export function DeleteFamilyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const confirmDeletion = useConfirmAccountDeletion();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmAccountDeletionInput>({
    resolver: zodResolver(confirmAccountDeletionSchema),
    defaultValues: { token },
  });

  if (confirmDeletion.isSuccess) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Le compte famille et toutes ses données ont été définitivement supprimés.
        </p>
        <Link to="/" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="text-red-600 dark:text-red-400">Lien de confirmation invalide.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Confirmer la suppression du compte</p>
      </div>

      <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <strong>Cette action est irréversible.</strong> Tous les membres, comptes enfants, transactions
        et l'historique de cette famille seront définitivement supprimés.
      </p>

      <form
        onSubmit={handleSubmit((values) => confirmDeletion.mutate(values))}
        className="flex w-full flex-col gap-3"
      >
        <input type="hidden" {...register('token')} value={token} />
        <label className="text-sm font-medium" htmlFor="ownerPassword">
          Ressaisis ton mot de passe pour confirmer
        </label>
        <input
          id="ownerPassword"
          type="password"
          autoFocus
          {...register('ownerPassword')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
        {errors.ownerPassword && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.ownerPassword.message}</p>
        )}

        {confirmDeletion.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {confirmDeletion.error instanceof ApiError
              ? (ERROR_MESSAGES[confirmDeletion.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={confirmDeletion.isPending}
          className="mt-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {confirmDeletion.isPending ? 'Suppression…' : 'Supprimer définitivement mon compte'}
        </button>
      </form>
    </div>
  );
}
