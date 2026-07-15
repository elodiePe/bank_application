import type { MoneyRequestStatus, MoneyRequestType } from '@banque-familiale/shared';

export const MONEY_REQUEST_TYPE_LABELS: Record<MoneyRequestType, string> = {
  DEPOSIT_REQUEST: 'Demande de dépôt',
  WITHDRAWAL_REQUEST: 'Demande de retrait',
  TRANSFER_REQUEST: 'Demande à un frère/une sœur',
};

export const MONEY_REQUEST_STATUS_LABELS: Record<MoneyRequestStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};
