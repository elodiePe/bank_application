import { SUPPORTED_CURRENCIES } from '@banque-familiale/shared';
import { useSettings, useUpdateCurrency } from '../hooks/useTransactionActions.js';

export function CurrencySettings() {
  const settings = useSettings();
  const updateCurrency = useUpdateCurrency();

  if (!settings.data) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-medium">Devise</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Change uniquement l'affichage des montants — les soldes existants ne sont pas convertis.
      </p>
      <select
        value={settings.data.currency}
        onChange={(e) => updateCurrency.mutate({ currency: e.target.value as (typeof SUPPORTED_CURRENCIES)[number]['code'] })}
        disabled={updateCurrency.isPending}
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
