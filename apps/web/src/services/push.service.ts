import type { PushSubscriptionKeys } from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function fetchVapidPublicKey(): Promise<{ publicKey: string | null }> {
  return apiGet('/notifications/push/vapid-public-key');
}

export function subscribePush(keys: PushSubscriptionKeys): Promise<void> {
  return apiPost('/notifications/push/subscribe', keys);
}

export function unsubscribePush(endpoint: string): Promise<void> {
  return apiPost('/notifications/push/unsubscribe', { endpoint });
}
