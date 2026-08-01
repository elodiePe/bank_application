import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAllNotifications, deleteNotification, fetchMyNotifications } from '../services/notification.service.js';

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
