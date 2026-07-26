import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDisputeInput } from '@banque-familiale/shared';
import {
  createDispute,
  dismissDispute,
  fetchMyDisputes,
  fetchPendingDisputes,
  resolveDispute,
} from '../services/dispute.service.js';

function useInvalidateDisputesAndDashboard() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['disputes'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useMyDisputes() {
  return useQuery({ queryKey: ['disputes', 'mine'], queryFn: fetchMyDisputes, staleTime: 15_000 });
}

export function usePendingDisputes() {
  return useQuery({ queryKey: ['disputes', 'pending'], queryFn: fetchPendingDisputes, staleTime: 15_000 });
}

export function useCreateDispute() {
  const invalidate = useInvalidateDisputesAndDashboard();
  return useMutation({
    mutationFn: (input: CreateDisputeInput) => createDispute(input),
    onSuccess: invalidate,
  });
}

export function useDismissDispute() {
  const invalidate = useInvalidateDisputesAndDashboard();
  return useMutation({
    mutationFn: (id: string) => dismissDispute(id),
    onSuccess: invalidate,
  });
}

export function useResolveDispute() {
  const invalidate = useInvalidateDisputesAndDashboard();
  return useMutation({
    mutationFn: (id: string) => resolveDispute(id),
    onSuccess: invalidate,
  });
}
