import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MoneyRequestSummary } from '@banque-familiale/shared';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { MONEY_REQUEST_STATUS_LABELS, MONEY_REQUEST_TYPE_LABELS } from '../utils/moneyRequestLabels.js';
import { useApproveMoneyRequest, useCancelMoneyRequest, useRejectMoneyRequest } from '../hooks/useMoneyRequests.js';
import { useDismissedIds } from '../hooks/useDismissedIds.js';
import { statusBackgroundClass } from '../utils/statusColors.js';
import { TypeBadge } from './TypeBadge.js';
import { Modal } from './Modal.js';

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
  const { dismissed: dismissedIds, dismiss } = useDismissedIds(viewerId, 'money-requests');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const visibleRequests = requests.filter((r) => !dismissedIds.has(r.id));

  if (visibleRequests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <>
    <ul className="flex flex-col gap-2">
      {visibleRequests.map((r, index) => {
        const isRequester = r.requesterId === viewerId;
        const canRespond =
          r.status === 'PENDING' &&
          !isRequester &&
          (r.type === 'TRANSFER_REQUEST' ? r.targetUserId === viewerId : viewerRole === 'PARENT');
        const canCancel = r.status === 'PENDING' && isRequester;
        const canDismiss = r.status !== 'PENDING';

        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`relative flex items-center justify-between rounded-xl border border-slate-200 p-3 shadow-sm dark:border-slate-700 ${statusBackgroundClass(r.status)}`}
          >
            <div className={canDismiss ? 'pr-6' : undefined}>
              <TypeBadge>{MONEY_REQUEST_TYPE_LABELS[r.type]}</TypeBadge>
              <p className="font-medium">
                {r.requesterFirstName}
                {r.targetFirstName ? ` → ${r.targetFirstName}` : ''}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatMoney(r.amountCents, STORAGE_CURRENCY)}
                {r.comment ? ` · ${r.comment}` : ''} · {formatDate(r.createdAt)} ·{' '}
                {MONEY_REQUEST_STATUS_LABELS[r.status]}
                {r.respondedByFirstName ? ` (${r.respondedByFirstName})` : ''}
              </p>
              {r.receiptPhotoDataUrl && (
                <button
                  type="button"
                  onClick={() => setReceiptPreview(r.receiptPhotoDataUrl)}
                  className="mt-1"
                >
                  <img
                    src={r.receiptPhotoDataUrl}
                    alt="Ticket de caisse"
                    className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                </button>
              )}
            </div>
            {(canRespond || canCancel) && (
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
            )}
            {canDismiss && (
              <button
                type="button"
                onClick={() => dismiss(r.id)}
                aria-label="Masquer cette demande"
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </motion.li>
        );
      })}
    </ul>
    {receiptPreview && (
      <Modal open onClose={() => setReceiptPreview(null)} title="Ticket de caisse">
        <img src={receiptPreview} alt="Ticket de caisse" className="w-full rounded-lg" />
      </Modal>
    )}
    </>
  );
}
