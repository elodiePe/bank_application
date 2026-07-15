import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification.service.js';

export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: fetchMyNotifications,
    staleTime: 10_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export function useMarkNotificationAsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsAsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidate,
  });
}
