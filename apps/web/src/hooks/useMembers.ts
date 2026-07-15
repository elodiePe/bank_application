import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddMemberInput,
  ChangePasswordInput,
  ChangePinInput,
  ConfirmMemberPasswordResetInput,
  DeactivateMemberInput,
  ResetPasswordInput,
  ResetPinInput,
  SetEmailInput,
} from '@banque-familiale/shared';
import {
  addMember,
  changeOwnPassword,
  changeOwnPin,
  confirmMemberPasswordReset,
  deactivateMember,
  fetchMembers,
  requestMemberPasswordReset,
  requestPinResetNotification,
  resetMemberPassword,
  resetMemberPin,
  setOwnEmail,
} from '../services/member.service.js';
import { useInvalidateCurrentUser } from './useAuth.js';

const MEMBERS_QUERY_KEY = ['members'] as const;

export function useMembers(enabled = true) {
  return useQuery({ queryKey: MEMBERS_QUERY_KEY, queryFn: fetchMembers, enabled });
}

function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
}

export function useSetOwnEmail() {
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: (input: SetEmailInput) => setOwnEmail(input),
    onSuccess: async () => {
      await invalidateCurrentUser();
      await invalidateMembers();
    },
  });
}

export function useChangeOwnPassword() {
  return useMutation({ mutationFn: (input: ChangePasswordInput) => changeOwnPassword(input) });
}

export function useChangeOwnPin() {
  return useMutation({ mutationFn: (input: ChangePinInput) => changeOwnPin(input) });
}

export function useAddMember() {
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: (input: AddMemberInput) => addMember(input),
    onSuccess: invalidateMembers,
  });
}

export function useResetMemberPassword() {
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: ResetPasswordInput }) =>
      resetMemberPassword(memberId, input),
  });
}

export function useResetMemberPin() {
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: ResetPinInput }) =>
      resetMemberPin(memberId, input),
  });
}

export function useRequestMemberPasswordReset() {
  return useMutation({ mutationFn: (memberId: string) => requestMemberPasswordReset(memberId) });
}

export function useConfirmMemberPasswordReset() {
  return useMutation({
    mutationFn: (input: ConfirmMemberPasswordResetInput) => confirmMemberPasswordReset(input),
  });
}

export function useRequestPinResetNotification() {
  return useMutation({ mutationFn: (memberId: string) => requestPinResetNotification(memberId) });
}

export function useDeactivateMember() {
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: DeactivateMemberInput }) =>
      deactivateMember(memberId, input),
    onSuccess: invalidateMembers,
  });
}
