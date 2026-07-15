import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Sibling } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useCreateMoneyRequest } from '../hooks/useMoneyRequests.js';
import { useCurrency } from '../hooks/useTransactionActions.js';

const formSchema = z
  .object({
    type: z.enum(['DEPOSIT_REQUEST', 'WITHDRAWAL_REQUEST', 'TRANSFER_REQUEST']),
    amountChf: z.coerce.number().positive('Le montant doit être positif'),
    comment: z.string().trim().max(280).optional(),
    targetUserId: z.string().optional(),
  })
  .refine((d) => (d.type === 'TRANSFER_REQUEST' ? !!d.targetUserId : true), {
    message: 'Choisis un frère ou une sœur',
    path: ['targetUserId'],
  });
type FormValues = z.infer<typeof formSchema>;

export function RequestMoneyModal({ siblings, onClose }: { siblings: Sibling[]; onClose: () => void }) {
  const createRequest = useCreateMoneyRequest();
  const currency = useCurrency();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'DEPOSIT_REQUEST' },
  });
  const type = watch('type');

  function onSubmit(values: FormValues) {
    createRequest.mutate(
      {
        type: values.type,
        amountCents: Math.round(values.amountChf * 100),
        comment: values.comment,
        targetUserId: values.type === 'TRANSFER_REQUEST' ? values.targetUserId : undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title="Demander de l'argent">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="type">
          Type de demande
        </label>
        <select
          id="type"
          {...register('type')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="DEPOSIT_REQUEST">Demander de l'argent (aux parents)</option>
          <option value="WITHDRAWAL_REQUEST">Demander un retrait en espèces</option>
          <option value="TRANSFER_REQUEST">Demander à un frère/une sœur</option>
        </select>

        {type === 'TRANSFER_REQUEST' && (
          <>
            <label className="text-sm font-medium" htmlFor="targetUserId">
              À qui ?
            </label>
            <select
              id="targetUserId"
              {...register('targetUserId')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Choisir…</option>
              {siblings.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.firstName}
                </option>
              ))}
            </select>
            {errors.targetUserId && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.targetUserId.message}</p>
            )}
          </>
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
          Pour quoi faire ? (optionnel)
        </label>
        <input
          id="comment"
          type="text"
          {...register('comment')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />

        {createRequest.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">Une erreur est survenue.</p>
        )}

        <button
          type="submit"
          disabled={createRequest.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {createRequest.isPending ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </Modal>
  );
}
