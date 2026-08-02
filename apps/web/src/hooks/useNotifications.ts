import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationCategory } from '@banque-familiale/shared';
import {
  deleteAllNotifications,
  deleteNotification,
  fetchMyNotifications,
  fetchNotificationPreferences,
  updateNotificationPreference,
} from '../services/notification.service.js';

export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: fetchMyNotifications,
    staleTime: 10_000,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

/** Reading a notification and deleting it are the same action here — each row belongs to
 * exactly one recipient (no other account can ever see it), so there's nothing to keep once
 * this account has acknowledged it. */
export function useDeleteNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: invalidate,
  });
}

export function useDeleteAllNotifications() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: invalidate,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: fetchNotificationPreferences,
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, enabled }: { category: NotificationCategory; enabled: boolean }) =>
      updateNotificationPreference(category, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  });
}
