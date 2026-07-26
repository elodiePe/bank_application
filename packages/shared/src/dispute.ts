import { z } from 'zod';
import type { TransactionType } from './transaction.js';

export type DisputeStatus = 'PENDING' | 'DISMISSED' | 'RESOLVED';

export interface DisputeSummary {
  id: string;
  transactionId: string;
  raisedById: string;
  raisedByFirstName: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedByFirstName: string | null;
  resolvedAt: string | null;
  /** Snapshot of the disputed transaction, so the list can render + offer a correction
   * without a second round trip. */
  transactionType: TransactionType;
  transactionAmountCents: number;
  transactionOccurredAt: string;
}

export const createDisputeSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().trim().min(1, 'Explique ce qui te semble incorrect').max(280),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
