import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCustomNotificationInput } from '@banque-familiale/shared';
import {
  createCustomNotification,
  deleteCustomNotification,
  fetchCustomNotifications,
} from '../services/customNotification.service.js';

export function useCustomNotifications() {
  return useQuery({ queryKey: ['custom-notifications'], queryFn: fetchCustomNotifications, staleTime: 30_000 });
}

export function useCreateCustomNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomNotificationInput) => createCustomNotification(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-notifications'] }),
  });
}

export function useDeleteCustomNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-notifications'] }),
  });
}
