import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TransactionSummary } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useCreateDispute } from '../hooks/useDisputes.js';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';
import { ApiError } from '../services/api.js';

const formSchema = z.object({
  reason: z.string().trim().min(1, "Explique ce qui te semble incorrect").max(280),
});
type FormValues = z.infer<typeof formSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  CONFLICT: 'Une signalisation est déjà en cours pour cette opération.',
};

export function DisputeModal({
  transaction,
  onClose,
}: {
  transaction: TransactionSummary;
  onClose: () => void;
}) {
  const createDispute = useCreateDispute();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    createDispute.mutate(
      { transactionId: transaction.id, reason: values.reason },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Signaler une erreur">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {TRANSACTION_TYPE_LABELS[transaction.type]} · {formatMoney(transaction.amountCents, STORAGE_CURRENCY)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Un parent sera prévenu et pourra corriger l'opération si besoin.
        </p>

        <label className="text-sm font-medium" htmlFor="dispute-reason">
          Qu'est-ce qui ne va pas ?
        </label>
        <input
          id="dispute-reason"
          type="text"
          autoFocus
          {...register('reason')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.reason && <p className="text-sm text-red-600 dark:text-red-400">{errors.reason.message}</p>}

        {createDispute.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {createDispute.error instanceof ApiError
              ? (ERROR_MESSAGES[createDispute.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={createDispute.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {createDispute.isPending ? 'Envoi…' : 'Signaler'}
        </button>
      </form>
    </Modal>
  );
}
