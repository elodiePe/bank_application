import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { useCurrency, useSetWeeklyAllowance } from '../hooks/useTransactionActions.js';
import { formatMoney } from '../utils/currency.js';

const formSchema = z.object({
  amountChf: z.coerce.number().min(0, 'Ne peut pas être négatif'),
});
type FormValues = z.infer<typeof formSchema>;

function AllowanceRow({ child }: { child: ChildBalanceSummary }) {
  const [editing, setEditing] = useState(false);
  const setAllowance = useSetWeeklyAllowance();
  const currency = useCurrency();
  const { register, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    setAllowance.mutate(
      { accountId: child.accountId, input: { amountCents: Math.round(values.amountChf * 100) } },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span>{child.firstName}</span>
      {!editing ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {child.weeklyAllowanceCents > 0
              ? `${formatMoney(child.weeklyAllowanceCents, currency)} / semaine`
              : 'Désactivé'}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            Modifier
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            defaultValue={(child.weeklyAllowanceCents / 100).toFixed(2)}
            autoFocus
            {...register('amountChf')}
            className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
          />
          <span className="text-sm">{currency}</span>
          <button
            type="submit"
            disabled={setAllowance.isPending}
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

export function WeeklyAllowanceSettings({ children }: { children: ChildBalanceSummary[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-medium">Argent de poche hebdomadaire</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
        Versé automatiquement chaque lundi. 0 = désactivé.
      </p>
      <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
        {children.map((child) => (
          <AllowanceRow key={child.accountId} child={child} />
        ))}
      </div>
    </div>
  );
}
