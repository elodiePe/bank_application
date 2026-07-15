import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSettings, useUpdateInterestRate } from '../hooks/useTransactionActions.js';

const formSchema = z.object({
  ratePercent: z.coerce.number().min(0, 'Ne peut pas être négatif').max(100, 'Maximum 100%'),
});
type FormValues = z.infer<typeof formSchema>;

export function InterestRateSettings() {
  const settings = useSettings();
  const updateRate = useUpdateInterestRate();
  const [editing, setEditing] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    updateRate.mutate(
      { rateBps: Math.round(values.ratePercent * 100) },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (!settings.data) return null;

  const currentPercent = (settings.data.defaultInterestRateBps / 100).toFixed(2);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-medium">Taux d'intérêt annuel</h3>
      {!editing ? (
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold">{currentPercent} %</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              versé en 12 fois, à la fin de chaque mois
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            Modifier
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            defaultValue={currentPercent}
            autoFocus
            {...register('ratePercent')}
            className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
          />
          <span className="text-sm">%</span>
          <button
            type="submit"
            disabled={updateRate.isPending}
            className="rounded-lg bg-brand-600 px-3 py-1 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Annuler
          </button>
        </form>
      )}
    </div>
  );
}
