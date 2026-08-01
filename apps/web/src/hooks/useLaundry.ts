import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLaundryTypeInput,
  ReorderLaundryTypesInput,
  SetLaundryOccurrenceStatusInput,
  UpdateLaundryTypeInput,
} from '@banque-familiale/shared';
import {
  createLaundryType,
  deleteLaundryType,
  fetchLaundryTypes,
  fetchLaundryUpcoming,
  reorderLaundryTypes,
  setLaundryOccurrenceStatus,
  updateLaundryType,
} from '../services/laundry.service.js';

export function useLaundryTypes() {
  return useQuery({ queryKey: ['laundry'], queryFn: fetchLaundryTypes, staleTime: 30_000 });
}

export function useLaundryUpcoming(days = 7) {
  return useQuery({
    queryKey: ['laundry', 'upcoming', days],
    queryFn: () => fetchLaundryUpcoming(days),
    staleTime: 30_000,
  });
}

export function useCreateLaundryType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLaundryTypeInput) => createLaundryType(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laundry'] }),
  });
}

export function useUpdateLaundryType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLaundryTypeInput }) => updateLaundryType(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laundry'] }),
  });
}

export function useDeleteLaundryType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLaundryType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laundry'] }),
  });
}

export function useReorderLaundryTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderLaundryTypesInput) => reorderLaundryTypes(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laundry'] }),
  });
}

export function useSetLaundryOccurrenceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetLaundryOccurrenceStatusInput) => setLaundryOccurrenceStatus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laundry'] }),
  });
}
