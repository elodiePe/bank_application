import { z } from 'zod';

export type MoneyRequestType = 'DEPOSIT_REQUEST' | 'WITHDRAWAL_REQUEST' | 'TRANSFER_REQUEST';
export type MoneyRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface MoneyRequestSummary {
  id: string;
  requesterId: string;
  requesterFirstName: string;
  /** Null when the request targets "the parents" generically (deposit/withdrawal requests). */
  targetUserId: string | null;
  targetFirstName: string | null;
  type: MoneyRequestType;
  status: MoneyRequestStatus;
  amountCents: number;
  comment: string | null;
  createdAt: string;
  respondedByFirstName: string | null;
  respondedAt: string | null;
}

export const createMoneyRequestSchema = z
  .object({
    type: z.enum(['DEPOSIT_REQUEST', 'WITHDRAWAL_REQUEST', 'TRANSFER_REQUEST']),
    amountCents: z.number().int().positive('Le montant doit être positif'),
    comment: z.string().trim().max(280).optional(),
    targetUserId: z.string().min(1).optional(),
  })
  .refine((data) => (data.type === 'TRANSFER_REQUEST' ? !!data.targetUserId : true), {
    message: 'Choisissez un frère ou une sœur',
    path: ['targetUserId'],
  });
export type CreateMoneyRequestInput = z.infer<typeof createMoneyRequestSchema>;
