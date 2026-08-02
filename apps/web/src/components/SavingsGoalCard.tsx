import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useDeleteSavingsGoal, useMySavingsGoal, useUpsertSavingsGoal } from '../hooks/useSavingsGoal.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { resizeImageToDataUrl } from '../utils/imageResize.js';
import { Modal } from './Modal.js';
import { IconButton } from './IconButton.js';
import { PencilIcon, TrashIcon } from './icons.js';

const formSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(80),
  targetAmount: z.coerce.number().positive('Le montant doit être positif'),
});
type FormValues = z.infer<typeof formSchema>;

function EditGoalModal({
  open,
  onClose,
  initialTitle,
  initialTargetCents,
  initialPhotoDataUrl,
}: {
  open: boolean;
  onClose: () => void;
  initialTitle: string;
  initialTargetCents: number;
  initialPhotoDataUrl: string | null;
}) {
  const upsert = useUpsertSavingsGoal();
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(initialPhotoDataUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: initialTitle, targetAmount: initialTargetCents ? initialTargetCents / 100 : undefined },
  });

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      setPhotoDataUrl(await resizeImageToDataUrl(file));
    } catch {
      setPhotoError("Impossible de lire cette photo.");
    }
  }

  function onSubmit(values: FormValues) {
    upsert.mutate(
      { title: values.title, targetCents: Math.round(values.targetAmount * 100), photoDataUrl },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Mon objectif d'épargne">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="goal-title">
          Je veux économiser pour…
        </label>
        <input
          id="goal-title"
          type="text"
          autoFocus
          placeholder="Ex: Vélo, console de jeux…"
          {...register('title')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.title && <p className="text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}

        <label className="text-sm font-medium" htmlFor="goal-amount">
          Prix ({STORAGE_CURRENCY})
        </label>
        <input
          id="goal-amount"
          type="number"
          step="0.01"
          {...register('targetAmount')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.targetAmount && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.targetAmount.message}</p>
        )}

        <label className="text-sm font-medium" htmlFor="goal-photo">
          Photo (optionnel)
        </label>
        {photoDataUrl && (
          <img src={photoDataUrl} alt="" className="h-32 w-full rounded-lg object-cover" />
        )}
        <input
          id="goal-photo"
          type="file"
          accept="image/*"
          onChange={onPhotoChange}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:file:bg-brand-900/40 dark:file:text-brand-400"
        />
        {photoError && <p className="text-sm text-red-600 dark:text-red-400">{photoError}</p>}

        <button
          type="submit"
          disabled={upsert.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  );
}

/** A child's savings goal, shown against their live balance so they see how much is still
 * missing to get there — set once via the pencil, replaces itself on the next edit. */
export function SavingsGoalCard({ balanceCents }: { balanceCents: number }) {
  const goal = useMySavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const { currency, rate, rateLoading } = useFxRate();
  const [editOpen, setEditOpen] = useState(false);

  if (goal.isLoading) return null;

  if (!goal.data) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Mon objectif d'épargne</h2>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="w-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          🎯 Pas encore d'objectif — clique pour en créer un !
        </button>
        <EditGoalModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initialTitle=""
          initialTargetCents={0}
          initialPhotoDataUrl={null}
        />
      </section>
    );
  }

  const { title, targetCents, photoDataUrl } = goal.data;
  const remainingCents = Math.max(0, targetCents - balanceCents);
  const reached = remainingCents === 0;
  const progressPercent = Math.min(100, Math.round((balanceCents / targetCents) * 100));

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Mon objectif d'épargne</h2>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        {photoDataUrl ? (
          <img src={photoDataUrl} alt={title} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-6xl dark:from-brand-900/40 dark:to-brand-800/40">
            🎯
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{title}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton label="Modifier" onClick={() => setEditOpen(true)}>
                <PencilIcon />
              </IconButton>
              <IconButton label="Supprimer" variant="red" onClick={() => deleteGoal.mutate()}>
                <TrashIcon />
              </IconButton>
            </div>
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {rateLoading
              ? '…'
              : `${formatMoney(convertCents(balanceCents, rate), currency)} sur ${formatMoney(convertCents(targetCents, rate), currency)}`}
          </p>

          <p className="mt-1 text-sm font-medium">
            {rateLoading
              ? '…'
              : reached
                ? '🎉 Objectif atteint !'
                : `Il te manque ${formatMoney(convertCents(remainingCents, rate), currency)}`}
          </p>
        </div>
      </motion.div>

      <EditGoalModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialTitle={title}
        initialTargetCents={targetCents}
        initialPhotoDataUrl={photoDataUrl}
      />
    </section>
  );
}
