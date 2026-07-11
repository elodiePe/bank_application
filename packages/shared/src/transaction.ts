export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INTEREST'
  | 'TRANSFER'
  | 'REQUEST'
  | 'VALIDATION'
  | 'REFUSAL'
  | 'CORRECTION';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'REVERSED';

export interface TransactionSummary {
  id: string;
  childFirstName: string;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: number;
  balanceAfterCents: number;
  comment: string | null;
  occurredAt: string;
}
