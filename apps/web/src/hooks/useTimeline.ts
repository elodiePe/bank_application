import { useQuery } from '@tanstack/react-query';
import type { TransactionListQuery } from '@banque-familiale/shared';
import { fetchFamilyTimeline, fetchMyTimeline } from '../services/timeline.service.js';

export function useFamilyTimeline(query: TransactionListQuery, enabled = true) {
  return useQuery({
    queryKey: ['timeline', 'family', query],
    queryFn: () => fetchFamilyTimeline(query),
    staleTime: 10_000,
    enabled,
  });
}

export function useMyTimeline(query: TransactionListQuery, enabled = true) {
  return useQuery({
    queryKey: ['timeline', 'mine', query],
    queryFn: () => fetchMyTimeline(query),
    staleTime: 10_000,
    enabled,
  });
}
