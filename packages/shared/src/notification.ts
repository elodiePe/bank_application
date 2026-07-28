import { z } from 'zod';

export type NotificationType =
  | 'MONEY_REQUEST_CREATED'
  | 'MONEY_REQUEST_APPROVED'
  | 'MONEY_REQUEST_REJECTED'
  | 'TRANSFER_RECEIVED'
  | 'DEPOSIT_RECEIVED'
  | 'WITHDRAWAL_PROCESSED'
  | 'INTEREST_APPLIED'
  | 'CORRECTION_APPLIED'
  | 'STOCK_ORDER_CREATED'
  | 'STOCK_ORDER_APPROVED'
  | 'STOCK_ORDER_REJECTED'
  | 'STOCK_GIFT_RECEIVED'
  | 'CREDENTIAL_RESET_REQUESTED'
  | 'DISPUTE_RAISED'
  | 'DISPUTE_DISMISSED'
  | 'CHORE_COMPLETED'
  | 'CHORE_APPROVED'
  | 'CHORE_REJECTED'
  | 'CHORE_REMINDER'
  | 'MEAL_PLAN_TURN'
  | 'GENERIC';

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedTransactionId: string | null;
  relatedMoneyRequestId: string | null;
  relatedDisputeId: string | null;
  relatedChoreCompletionId: string | null;
  /// Set only for CHORE_REMINDER (fires before any completion exists).
  relatedChoreId: string | null;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
