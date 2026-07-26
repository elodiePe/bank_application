import type { TransactionStatus, TransactionType } from '@banque-familiale/shared';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Dépôt',
  WITHDRAWAL: 'Retrait',
  INTEREST: 'Intérêt',
  TRANSFER: 'Virement',
  REQUEST: 'Demande',
  VALIDATION: 'Validation',
  REFUSAL: 'Refus',
  CORRECTION: 'Correction',
  STOCK_BUY: "Achat d'actions",
  STOCK_SELL: "Vente d'actions",
  STOCK_GIFT: "Cadeau d'actions",
};

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  DEPOSIT: '💰',
  WITHDRAWAL: '💸',
  INTEREST: '📈',
  TRANSFER: '🔄',
  REQUEST: '🙋',
  VALIDATION: '✅',
  REFUSAL: '❌',
  CORRECTION: '↩️',
  STOCK_BUY: '📊',
  STOCK_SELL: '📉',
  STOCK_GIFT: '🎁',
};

/** Light background per transaction type, used on history cards instead of an icon. */
export const TRANSACTION_TYPE_BG_CLASSES: Record<TransactionType, string> = {
  DEPOSIT: 'bg-emerald-50 dark:bg-emerald-950/40',
  WITHDRAWAL: 'bg-red-50 dark:bg-red-950/40',
  INTEREST: 'bg-teal-50 dark:bg-teal-950/40',
  TRANSFER: 'bg-blue-50 dark:bg-blue-950/40',
  REQUEST: 'bg-amber-50 dark:bg-amber-950/40',
  VALIDATION: 'bg-emerald-50 dark:bg-emerald-950/40',
  REFUSAL: 'bg-red-50 dark:bg-red-950/40',
  CORRECTION: 'bg-orange-50 dark:bg-orange-950/40',
  STOCK_BUY: 'bg-indigo-50 dark:bg-indigo-950/40',
  STOCK_SELL: 'bg-orange-50 dark:bg-orange-950/40',
  STOCK_GIFT: 'bg-pink-50 dark:bg-pink-950/40',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Terminée',
  REJECTED: 'Refusée',
  REVERSED: 'Annulée',
};

/**
 * Whether this specific transaction increased (credit) or decreased (debit) the account's
 * balance. Derived from the before/after snapshot rather than the type, so it's correct even
 * for types like TRANSFER or CORRECTION whose direction depends on which leg this row is.
 */
export function transactionSign(t: { balanceBeforeCents: number; balanceAfterCents: number }): 1 | -1 | 0 {
  return Math.sign(t.balanceAfterCents - t.balanceBeforeCents) as 1 | -1 | 0;
}
