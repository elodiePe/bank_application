import { useQuery } from '@tanstack/react-query';
import { fetchParentOverview, fetchRecentTransactions } from '../services/dashboard.service.js';

export function useParentOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchParentOverview,
    staleTime: 30_000,
  });
}

export function useRecentTransactions(limit = 15) {
  return useQuery({
    queryKey: ['dashboard', 'recent-transactions', limit],
    queryFn: () => fetchRecentTransactions(limit),
    staleTime: 30_000,
  });
}
