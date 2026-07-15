export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INTEREST'
  | 'TRANSFER'
  | 'REQUEST'
  | 'VALIDATION'
  | 'REFUSAL'
  | 'CORRECTION'
  | 'STOCK_BUY'
  | 'STOCK_SELL'
  | 'STOCK_GIFT';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'REVERSED';

export interface TransactionSummary {
  id: string;
  childUserId: string;
  childFirstName: string;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  comment: string | null;
  occurredAt: string;
  /** Whether a parent can still correct this operation (false once already reversed). */
  isReversible: boolean;
  senderFirstName: string | null;
  receiverFirstName: string | null;
  validatedByFirstName: string | null;
}

export interface TransactionListQuery {
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  /** Parent view only — scope results to a single child. */
  childUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'occurredAt' | 'amountCents';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface TransactionListResult {
  items: TransactionSummary[];
  total: number;
  page: number;
  pageSize: number;
}
