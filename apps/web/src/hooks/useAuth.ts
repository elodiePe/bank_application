import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api.js';
import { fetchCurrentUser } from '../services/auth.service.js';

export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });
}

/** True once we know for certain the visitor isn't logged in (401), not while still loading. */
export function isUnauthenticatedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
}
