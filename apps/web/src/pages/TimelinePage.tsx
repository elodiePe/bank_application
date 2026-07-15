import { useState } from 'react';
import type { TransactionListQuery, TransactionSummary } from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useParentOverview } from '../hooks/useDashboard.js';
import { useFamilyTimeline, useMyTimeline } from '../hooks/useTimeline.js';
import { TimelineCard } from '../components/TimelineCard.js';
import { TimelineFilters } from '../components/TimelineFilters.js';
import { Pagination } from '../components/Pagination.js';
import { CorrectionModal } from '../components/CorrectionModal.js';

const DEFAULT_QUERY: TransactionListQuery = { page: 1, pageSize: 20, sortBy: 'occurredAt', sortDir: 'desc' };

export function TimelinePage() {
  const { data: user } = useCurrentUser();
  const isParent = user?.role === 'PARENT';

  const [query, setQuery] = useState<TransactionListQuery>(DEFAULT_QUERY);
  const [correctionTarget, setCorrectionTarget] = useState<TransactionSummary | null>(null);

  const overview = useParentOverview();
  const familyResult = useFamilyTimeline(query, isParent);
  const myResult = useMyTimeline(query, user !== undefined && !isParent);

  const result = isParent ? familyResult : myResult;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Historique complet</h1>

      <TimelineFilters
        query={query}
        onChange={setQuery}
        children={isParent ? overview.data?.children.map((c) => ({ userId: c.userId, firstName: c.firstName })) : undefined}
      />

      {result.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
      {result.isError && (
        <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>
      )}

      {result.data && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {result.data.total} opération{result.data.total > 1 ? 's' : ''}
          </p>

          {result.data.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Aucune opération ne correspond à ces filtres.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {result.data.items.map((t, index) => (
                <TimelineCard
                  key={t.id}
                  transaction={t}
                  index={index}
                  showChildName={isParent}
                  onCorrect={isParent ? setCorrectionTarget : undefined}
                />
              ))}
            </div>
          )}

          <Pagination
            page={result.data.page}
            pageSize={result.data.pageSize}
            total={result.data.total}
            onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
          />
        </>
      )}

      {correctionTarget && (
        <CorrectionModal transaction={correctionTarget} onClose={() => setCorrectionTarget(null)} />
      )}
    </div>
  );
}
