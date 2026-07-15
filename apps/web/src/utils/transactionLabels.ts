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
