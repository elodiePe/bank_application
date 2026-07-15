import { useQuery } from '@tanstack/react-query';
import {
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
