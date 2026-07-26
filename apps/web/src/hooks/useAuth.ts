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

/** For a CHILD (or while loading), every permission reads as granted — only PARENT UI
 * gates on these, so there's nothing to hide for a child viewing their own dashboard. */
export function usePermission(
  permission: 'canManageMoney' | 'canManageActions' | 'canManageSettings' | 'canManageFamily',
): boolean {
  const { data: user } = useCurrentUser();
  if (!user || user.role !== 'PARENT' || !user.permissions) return true;
  return user.permissions.isAdmin || user.permissions[permission];
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
}
