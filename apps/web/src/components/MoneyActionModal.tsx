import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal.js';
import { useCurrency, useDeposit, useWithdrawal } from '../hooks/useTransactionActions.js';
import { ApiError } from '../services/api.js';

const formSchema = z.object({
  amountChf: z.coerce.number().positive('Le montant doit être positif'),
  comment: z.string().trim().max(280).optional(),
});
type FormValues = z.infer<typeof formSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Solde insuffisant pour ce retrait.',
  FORBIDDEN: 'Ce compte ne fait pas partie de votre famille.',
};

interface MoneyActionModalProps {
  mode: 'DEPOSIT' | 'WITHDRAWAL';
  accountId: string;
  childFirstName: string;
  onClose: () => void;
}

export function MoneyActionModal({ mode, accountId, childFirstName, onClose }: MoneyActionModalProps) {
  const deposit = useDeposit();
  const withdrawal = useWithdrawal();
  const currency = useCurrency();
  const mutation = mode === 'DEPOSIT' ? deposit : withdrawal;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    mutation.mutate(
      { accountId, amountCents: Math.round(values.amountChf * 100), comment: values.comment },
      { onSuccess: onClose },
    );
  }

  const title = mode === 'DEPOSIT' ? `Ajouter de l'argent — ${childFirstName}` : `Retirer de l'argent — ${childFirstName}`;

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="amountChf">
          Montant ({currency})
        </label>
        <input
          id="amountChf"
          type="number"
          step="0.01"
          autoFocus
          {...register('amountChf')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.amountChf && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.amountChf.message}</p>
        )}

        <label className="text-sm font-medium" htmlFor="comment">
          Commentaire (optionnel)
        </label>
        <input
          id="comment"
          type="text"
          {...register('comment')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {mutation.error instanceof ApiError
              ? (ERROR_MESSAGES[mutation.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Envoi…' : 'Confirmer'}
        </button>
      </form>
    </Modal>
  );
}
