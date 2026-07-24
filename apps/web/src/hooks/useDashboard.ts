import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ParentDashboardOverview } from '@banque-familiale/shared';
import {
  completeOnboarding,
  fetchChildOverview,
  fetchMyTransactions,
  fetchParentOverview,
  fetchRecentTransactions,
} from '../services/dashboard.service.js';

export function useParentOverview(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchParentOverview,
    staleTime: 30_000,
    enabled,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      // Patch the cache directly instead of just invalidating: the dashboard route (which
      // gates on this exact flag) mounts and reads the cache synchronously right after this
      // resolves, before an invalidation-triggered refetch would have landed — that race
      // was bouncing straight back into the wizard even though the flag was already saved.
      queryClient.setQueryData<ParentDashboardOverview>(['dashboard', 'overview'], (old) =>
        old ? { ...old, onboardingCompleted: true } : old,
      );
      return queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
    },
  });
}

export function useRecentTransactions(limit = 15) {
  return useQuery({
    queryKey: ['dashboard', 'recent-transactions', limit],
    queryFn: () => fetchRecentTransactions(limit),
    staleTime: 30_000,
  });
}

export function useChildOverview() {
  return useQuery({
    queryKey: ['dashboard', 'me', 'overview'],
    queryFn: fetchChildOverview,
    staleTime: 30_000,
  });
}

export function useMyTransactions(limit = 15) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'transactions', limit],
    queryFn: () => fetchMyTransactions(limit),
    staleTime: 30_000,
  });
}
