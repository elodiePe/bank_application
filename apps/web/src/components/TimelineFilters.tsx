import type { TransactionListQuery, TransactionStatus, TransactionType } from '@banque-familiale/shared';
import { TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '../utils/transactionLabels.js';

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
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

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
        <select
          value={query.childUserId ?? ''}
          onChange={(e) => update({ childUserId: e.target.value || undefined })}
          className={inputClass}
        >
          <option value="">Tous les enfants</option>
          {children.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.firstName}
            </option>
          ))}
        </select>
      )}

      <select
        value={query.type ?? ''}
        onChange={(e) => update({ type: (e.target.value || undefined) as TransactionType | undefined })}
        className={inputClass}
      >
        <option value="">Tous les types</option>
        {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={query.status ?? ''}
        onChange={(e) => update({ status: (e.target.value || undefined) as TransactionStatus | undefined })}
        className={inputClass}
      >
        <option value="">Tous les statuts</option>
        {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

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

      <select
        value={`${query.sortBy ?? 'occurredAt'}:${query.sortDir ?? 'desc'}`}
        onChange={(e) => {
          const [sortBy, sortDir] = e.target.value.split(':') as [
            TransactionListQuery['sortBy'],
            TransactionListQuery['sortDir'],
          ];
          update({ sortBy, sortDir });
        }}
        className={inputClass}
      >
        <option value="occurredAt:desc">Plus récent d'abord</option>
        <option value="occurredAt:asc">Plus ancien d'abord</option>
        <option value="amountCents:desc">Montant décroissant</option>
        <option value="amountCents:asc">Montant croissant</option>
      </select>
    </div>
  );
}
