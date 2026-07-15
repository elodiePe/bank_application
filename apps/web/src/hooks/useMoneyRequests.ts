import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMoneyRequestInput } from '@banque-familiale/shared';
import {
  approveMoneyRequest,
  cancelMoneyRequest,
  createMoneyRequest,
  fetchMyRequests,
  fetchPendingRequests,
  rejectMoneyRequest,
} from '../services/moneyRequest.service.js';

function useInvalidateRequestsAndDashboard() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['money-requests'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useMyRequests() {
  return useQuery({ queryKey: ['money-requests', 'mine'], queryFn: fetchMyRequests, staleTime: 15_000 });
}

export function usePendingRequests() {
  return useQuery({
    queryKey: ['money-requests', 'pending'],
    queryFn: fetchPendingRequests,
    staleTime: 15_000,
  });
}

export function useCreateMoneyRequest() {
  const invalidate = useInvalidateRequestsAndDashboard();
  return useMutation({
    mutationFn: (input: CreateMoneyRequestInput) => createMoneyRequest(input),
    onSuccess: invalidate,
  });
}

export function useApproveMoneyRequest() {
  const invalidate = useInvalidateRequestsAndDashboard();
  return useMutation({
    mutationFn: (id: string) => approveMoneyRequest(id),
    onSuccess: invalidate,
  });
}

export function useRejectMoneyRequest() {
  const invalidate = useInvalidateRequestsAndDashboard();
  return useMutation({
    mutationFn: (id: string) => rejectMoneyRequest(id),
    onSuccess: invalidate,
  });
}

export function useCancelMoneyRequest() {
  const invalidate = useInvalidateRequestsAndDashboard();
  return useMutation({
    mutationFn: (id: string) => cancelMoneyRequest(id),
    onSuccess: invalidate,
  });
}
