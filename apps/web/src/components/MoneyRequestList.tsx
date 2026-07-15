import { motion } from 'framer-motion';
import type { MoneyRequestSummary } from '@banque-familiale/shared';
import { formatMoney } from '../utils/currency.js';
import { MONEY_REQUEST_STATUS_LABELS, MONEY_REQUEST_TYPE_LABELS } from '../utils/moneyRequestLabels.js';
import { useApproveMoneyRequest, useCancelMoneyRequest, useRejectMoneyRequest } from '../hooks/useMoneyRequests.js';
import { useCurrency } from '../hooks/useTransactionActions.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface MoneyRequestListProps {
  requests: MoneyRequestSummary[];
  viewerId: string;
  viewerRole: 'PARENT' | 'CHILD';
  emptyLabel: string;
}

export function MoneyRequestList({ requests, viewerId, viewerRole, emptyLabel }: MoneyRequestListProps) {
  const approve = useApproveMoneyRequest();
  const reject = useRejectMoneyRequest();
  const cancel = useCancelMoneyRequest();
  const currency = useCurrency();

  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r, index) => {
        const isRequester = r.requesterId === viewerId;
        const canRespond =
          r.status === 'PENDING' &&
          !isRequester &&
          (r.type === 'TRANSFER_REQUEST' ? r.targetUserId === viewerId : viewerRole === 'PARENT');
        const canCancel = r.status === 'PENDING' && isRequester;

        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="font-medium">
                {r.requesterFirstName}
                {r.targetFirstName ? ` → ${r.targetFirstName}` : ''} · {MONEY_REQUEST_TYPE_LABELS[r.type]}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatMoney(r.amountCents, currency)}
                {r.comment ? ` · ${r.comment}` : ''} · {formatDate(r.createdAt)} ·{' '}
                {MONEY_REQUEST_STATUS_LABELS[r.status]}
                {r.respondedByFirstName ? ` (${r.respondedByFirstName})` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {canRespond && (
                <>
                  <button
                    type="button"
                    onClick={() => approve.mutate(r.id)}
                    disabled={approve.isPending || reject.isPending}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    onClick={() => reject.mutate(r.id)}
                    disabled={approve.isPending || reject.isPending}
                    className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
                  >
                    Refuser
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => cancel.mutate(r.id)}
                  disabled={cancel.isPending}
                  className="text-sm text-slate-400 hover:text-brand-600 hover:underline dark:hover:text-brand-400"
                >
                  Annuler
                </button>
              )}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
