import type { CreateCustomNotificationInput, CustomNotificationSummary } from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPost } from './api.js';

export function fetchCustomNotifications(): Promise<CustomNotificationSummary[]> {
  return apiGet<CustomNotificationSummary[]>('/custom-notifications');
}

export function createCustomNotification(input: CreateCustomNotificationInput): Promise<CustomNotificationSummary> {
  return apiPost<CustomNotificationSummary>('/custom-notifications', input);
}

export function deleteCustomNotification(id: string): Promise<void> {
  return apiDelete<void>(`/custom-notifications/${id}`);
}
