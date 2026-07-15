import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ConfirmAccountDeletionInput,
  ConfirmPasswordResetInput,
  LoginFamilyInput,
  RegisterFamilyInput,
  RequestPasswordResetInput,
} from '@banque-familiale/shared';
import { ApiError } from '../services/api.js';
import {
  confirmAccountDeletion,
  confirmFamilyPasswordReset,
  fetchCurrentFamily,
  loginFamily,
  logoutFamily,
  registerFamily,
  requestAccountDeletion,
  requestFamilyPasswordReset,
} from '../services/familyAuth.service.js';

export const CURRENT_FAMILY_QUERY_KEY = ['family-auth', 'me'] as const;

export function useCurrentFamily() {
  return useQuery({
    queryKey: CURRENT_FAMILY_QUERY_KEY,
    queryFn: fetchCurrentFamily,
    retry: false,
    staleTime: 60_000,
  });
}

export function isFamilyUnauthenticatedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function useInvalidateCurrentFamily() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_FAMILY_QUERY_KEY });
}

export function useRegisterFamily() {
  const invalidate = useInvalidateCurrentFamily();
  return useMutation({
    mutationFn: (input: RegisterFamilyInput) => registerFamily(input),
    onSuccess: invalidate,
  });
}

export function useLoginFamily() {
  const invalidate = useInvalidateCurrentFamily();
  return useMutation({
    mutationFn: (input: LoginFamilyInput) => loginFamily(input),
    onSuccess: invalidate,
  });
}

export function useLogoutFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutFamily,
    onSuccess: () => queryClient.clear(),
  });
}

export function useRequestAccountDeletion() {
  return useMutation({ mutationFn: requestAccountDeletion });
}

export function useConfirmAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmAccountDeletionInput) => confirmAccountDeletion(input),
    onSuccess: () => queryClient.clear(),
  });
}

export function useRequestFamilyPasswordReset() {
  return useMutation({ mutationFn: (input: RequestPasswordResetInput) => requestFamilyPasswordReset(input) });
}

export function useConfirmFamilyPasswordReset() {
  return useMutation({ mutationFn: (input: ConfirmPasswordResetInput) => confirmFamilyPasswordReset(input) });
}
