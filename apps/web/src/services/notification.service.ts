import type { NotificationSummary } from '@banque-familiale/shared';
import { apiDelete, apiGet } from './api.js';

export function fetchMyNotifications(): Promise<NotificationSummary[]> {
  return apiGet<NotificationSummary[]>('/notifications');
}

export function deleteNotification(id: string): Promise<void> {
  return apiDelete<void>(`/notifications/${id}`);
}

export function deleteAllNotifications(): Promise<void> {
  return apiDelete<void>('/notifications');
}
