import type { NotificationCategory, NotificationPreferenceSummary, NotificationSummary } from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPut } from './api.js';

export function fetchMyNotifications(): Promise<NotificationSummary[]> {
  return apiGet<NotificationSummary[]>('/notifications');
}

export function deleteNotification(id: string): Promise<void> {
  return apiDelete<void>(`/notifications/${id}`);
}

export function deleteAllNotifications(): Promise<void> {
  return apiDelete<void>('/notifications');
}

export function fetchNotificationPreferences(): Promise<NotificationPreferenceSummary[]> {
  return apiGet<NotificationPreferenceSummary[]>('/notifications/preferences');
}

export function updateNotificationPreference(category: NotificationCategory, enabled: boolean): Promise<void> {
  return apiPut<void>(`/notifications/preferences/${category}`, { enabled });
}
