import type { TransactionListQuery, TransactionStatus, TransactionType } from '@banque-familiale/shared';
import { TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';
import { Select } from './Select.js';

interface Child {
  userId: string;
  firstName: string;
}

interface TimelineFiltersProps {
  query: TransactionListQuery;
  onChange: (query: TransactionListQuery) => void;
  children?: Child[];
}

const inputClass =
  'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

export function TimelineFilters({ query, onChange, children }: TimelineFiltersProps) {
  function update(patch: Partial<TransactionListQuery>) {
    onChange({ ...query, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="search"
        placeholder="Rechercher un commentaire…"
        value={query.search ?? ''}
        onChange={(e) => update({ search: e.target.value || undefined })}
        className={`${inputClass} min-w-[180px] flex-1`}
      />

      {children && children.length > 0 && (
        <Select
          value={query.childUserId ?? ''}
          onChange={(v) => update({ childUserId: v || undefined })}
          wrapperClassName="min-w-[150px]"
          options={[{ value: '', label: 'Tous les enfants' }, ...children.map((c) => ({ value: c.userId, label: c.firstName }))]}
        />
      )}

      <Select
        value={query.type ?? ''}
        onChange={(v) => update({ type: (v || undefined) as TransactionType | undefined })}
        wrapperClassName="min-w-[150px]"
        options={[
          { value: '', label: 'Tous les types' },
          ...Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
        ]}
      />

      <Select
        value={query.status ?? ''}
        onChange={(v) => update({ status: (v || undefined) as TransactionStatus | undefined })}
        wrapperClassName="min-w-[150px]"
        options={[
          { value: '', label: 'Tous les statuts' },
          ...Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
        ]}
      />

      <input
        type="date"
        value={query.dateFrom?.slice(0, 10) ?? ''}
        onChange={(e) => update({ dateFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined })}
        className={inputClass}
        aria-label="Date de début"
      />
      <input
        type="date"
        value={query.dateTo?.slice(0, 10) ?? ''}
        onChange={(e) => update({ dateTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined })}
        className={inputClass}
        aria-label="Date de fin"
      />

      <Select
        value={`${query.sortBy ?? 'occurredAt'}:${query.sortDir ?? 'desc'}`}
        onChange={(v) => {
          const [sortBy, sortDir] = v.split(':') as [TransactionListQuery['sortBy'], TransactionListQuery['sortDir']];
          update({ sortBy, sortDir });
        }}
        wrapperClassName="min-w-[170px]"
        options={[
          { value: 'occurredAt:desc', label: "Plus récent d'abord" },
          { value: 'occurredAt:asc', label: "Plus ancien d'abord" },
          { value: 'amountCents:desc', label: 'Montant décroissant' },
          { value: 'amountCents:asc', label: 'Montant croissant' },
        ]}
      />
    </div>
  );
}
