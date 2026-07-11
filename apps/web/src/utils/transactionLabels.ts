import type { TransactionType } from '@banque-familiale/shared';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Dépôt',
  WITHDRAWAL: 'Retrait',
  INTEREST: 'Intérêt',
  TRANSFER: 'Virement',
  REQUEST: 'Demande',
  VALIDATION: 'Validation',
  REFUSAL: 'Refus',
  CORRECTION: 'Correction',
};

/** Whether this transaction type increases (credit) or decreases (debit) the balance. */
const CREDIT_TYPES: ReadonlySet<TransactionType> = new Set(['DEPOSIT', 'INTEREST']);
const DEBIT_TYPES: ReadonlySet<TransactionType> = new Set(['WITHDRAWAL']);

export function transactionSign(type: TransactionType): 1 | -1 | 0 {
  if (CREDIT_TYPES.has(type)) return 1;
  if (DEBIT_TYPES.has(type)) return -1;
  return 0;
}
