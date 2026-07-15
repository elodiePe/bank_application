import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useCurrency, useTransfer } from '../hooks/useTransactionActions.js';
import { ApiError } from '../services/api.js';

const formSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amountChf: z.coerce.number().positive('Le montant doit être positif'),
    comment: z.string().trim().max(280).optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: 'Choisissez deux enfants différents',
    path: ['toAccountId'],
  });
type FormValues = z.infer<typeof formSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Solde insuffisant pour ce virement.',
  FORBIDDEN: 'Ce compte ne fait pas partie de votre famille.',
};

interface TransferModalProps {
  children: ChildBalanceSummary[];
  onClose: () => void;
}

export function TransferModal({ children, onClose }: TransferModalProps) {
  const transfer = useTransfer();
  const currency = useCurrency();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { fromAccountId: children[0]?.accountId, toAccountId: children[1]?.accountId },
  });

  function onSubmit(values: FormValues) {
    transfer.mutate(
      {
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amountCents: Math.round(values.amountChf * 100),
        comment: values.comment,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Virement entre enfants">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="fromAccountId">
          De
        </label>
        <select
          id="fromAccountId"
          {...register('fromAccountId')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        >
          {children.map((c) => (
            <option key={c.accountId} value={c.accountId}>
              {c.firstName}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium" htmlFor="toAccountId">
          Vers
        </label>
        <select
          id="toAccountId"
          {...register('toAccountId')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        >
          {children.map((c) => (
            <option key={c.accountId} value={c.accountId}>
              {c.firstName}
            </option>
          ))}
        </select>
        {errors.toAccountId && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.toAccountId.message}</p>
        )}

        <label className="text-sm font-medium" htmlFor="amountChf">
          Montant ({currency})
        </label>
        <input
          id="amountChf"
          type="number"
          step="0.01"
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

        {transfer.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {transfer.error instanceof ApiError
              ? (ERROR_MESSAGES[transfer.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={transfer.isPending || children.length < 2}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {transfer.isPending ? 'Envoi…' : 'Confirmer'}
        </button>
      </form>
    </Modal>
  );
}
