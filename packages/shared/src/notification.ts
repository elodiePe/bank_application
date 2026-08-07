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
  | 'LAUNDRY_TURN'
  | 'SHOPPING_TRIP'
  | 'GENERIC'
  | 'PAYMENT_PAST_DUE';

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

/// Coarse grouping of NotificationType a member can turn on/off independently — one toggle per
/// family-visible section, not per exact event (see categoryForNotificationType below).
export type NotificationCategory =
  | 'MONEY_REQUESTS'
  | 'STOCKS'
  | 'DISPUTES'
  | 'CHORES'
  | 'MEALS'
  | 'LAUNDRY'
  | 'SHOPPING'
  | 'CUSTOM';

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'MONEY_REQUESTS',
  'STOCKS',
  'DISPUTES',
  'CHORES',
  'MEALS',
  'LAUNDRY',
  'SHOPPING',
  'CUSTOM',
];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  MONEY_REQUESTS: 'Argent et demandes',
  STOCKS: 'Actions boursières',
  DISPUTES: 'Signalements',
  CHORES: 'Tâches',
  MEALS: 'Repas',
  LAUNDRY: 'Ménage',
  SHOPPING: 'Courses',
  CUSTOM: 'Notifications personnalisées',
};

/// Null means "not filterable" — always sent regardless of preferences. Only
/// CREDENTIAL_RESET_REQUESTED is exempt today: a parent must always hear about a child's PIN
/// reset request.
export function categoryForNotificationType(type: NotificationType): NotificationCategory | null {
  switch (type) {
    case 'MONEY_REQUEST_CREATED':
    case 'MONEY_REQUEST_APPROVED':
    case 'MONEY_REQUEST_REJECTED':
    case 'TRANSFER_RECEIVED':
    case 'DEPOSIT_RECEIVED':
    case 'WITHDRAWAL_PROCESSED':
    case 'INTEREST_APPLIED':
    case 'CORRECTION_APPLIED':
      return 'MONEY_REQUESTS';
    case 'STOCK_ORDER_CREATED':
    case 'STOCK_ORDER_APPROVED':
    case 'STOCK_ORDER_REJECTED':
    case 'STOCK_GIFT_RECEIVED':
      return 'STOCKS';
    case 'DISPUTE_RAISED':
    case 'DISPUTE_DISMISSED':
      return 'DISPUTES';
    case 'CHORE_COMPLETED':
    case 'CHORE_APPROVED':
    case 'CHORE_REJECTED':
    case 'CHORE_REMINDER':
      return 'CHORES';
    case 'MEAL_PLAN_TURN':
      return 'MEALS';
    case 'LAUNDRY_TURN':
      return 'LAUNDRY';
    case 'SHOPPING_TRIP':
      return 'SHOPPING';
    case 'GENERIC':
      return 'CUSTOM';
    case 'CREDENTIAL_RESET_REQUESTED':
    // A family risking deletion for non-payment must always see this, regardless of
    // notification preferences — same reasoning as CREDENTIAL_RESET_REQUESTED.
    case 'PAYMENT_PAST_DUE':
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export interface NotificationPreferenceSummary {
  category: NotificationCategory;
  enabled: boolean;
}

export const updateNotificationPreferenceSchema = z.object({
  enabled: z.boolean(),
});
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
