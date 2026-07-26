import type { DisputeStatus } from '@banque-familiale/shared';

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  PENDING: 'En attente',
  DISMISSED: 'Examinée',
  RESOLVED: 'Corrigée',
};
