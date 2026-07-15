import type { NotificationSummary } from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function fetchMyNotifications(): Promise<NotificationSummary[]> {
  return apiGet<NotificationSummary[]>('/notifications');
}

export function fetchUnreadCount(): Promise<{ count: number }> {
  return apiGet<{ count: number }>('/notifications/unread-count');
}

export function markNotificationAsRead(id: string): Promise<void> {
  return apiPost<void>(`/notifications/${id}/read`);
}

export function markAllNotificationsAsRead(): Promise<void> {
  return apiPost<void>('/notifications/read-all');
}
