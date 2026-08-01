import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDisputeInput } from '@banque-familiale/shared';
import {
  clearDispute,
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

// Parent-only endpoint (`requireRole('PARENT')`) — must be disabled for a child account, or
// it 403s every time and TanStack Query burns 3 retries on a call that can never succeed.
export function usePendingDisputes(enabled = true) {
  return useQuery({ queryKey: ['disputes', 'pending'], queryFn: fetchPendingDisputes, staleTime: 15_000, enabled });
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

export function useClearDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clearDispute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disputes'] }),
  });
}
