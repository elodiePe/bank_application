import { SUPPORTED_CURRENCIES } from '@banque-familiale/shared';
import { useSettings, useUpdateCurrency } from '../hooks/useTransactionActions.js';
import { Select } from './Select.js';

export function CurrencySettings() {
  const settings = useSettings();
  const updateCurrency = useUpdateCurrency();

  if (!settings.data) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="font-medium">Devise</h3>
      {/* <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Convertit le solde total et les soldes des enfants au taux de change actuel. L'historique
        des opérations reste toujours affiché dans sa devise d'origine ({'CHF'}).
      </p> */}
      <Select
        value={settings.data.currency}
        onChange={(v) => updateCurrency.mutate({ currency: v as (typeof SUPPORTED_CURRENCIES)[number]['code'] })}
        disabled={updateCurrency.isPending}
        wrapperClassName="mt-3"
        options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
      />
    </div>
  );
}
