import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TransactionSummary } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useCorrectTransaction, useCurrency } from '../hooks/useTransactionActions.js';
import { formatMoney } from '../utils/currency.js';
import { TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';

const formSchema = z.object({
  comment: z.string().trim().max(280).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function CorrectionModal({
  transaction,
  onClose,
}: {
  transaction: TransactionSummary;
  onClose: () => void;
}) {
  const correction = useCorrectTransaction();
  const currency = useCurrency();
  const { register, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    correction.mutate(
      { transactionId: transaction.id, input: values },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Corriger cette opération">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {transaction.childFirstName} · {TRANSACTION_TYPE_LABELS[transaction.type]} ·{' '}
          {formatMoney(transaction.amountCents, currency)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Une nouvelle opération inverse sera créée — l'historique original reste visible.
        </p>

        <label className="text-sm font-medium" htmlFor="correction-comment">
          Motif (optionnel)
        </label>
        <input
          id="correction-comment"
          type="text"
          {...register('comment')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

        {correction.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">Une erreur est survenue.</p>
        )}

        <button
          type="submit"
          disabled={correction.isPending}
          className="mt-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {correction.isPending ? 'Envoi…' : 'Confirmer la correction'}
        </button>
      </form>
    </Modal>
  );
}
