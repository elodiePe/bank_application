import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddMemberInput,
  ChangePinInput,
  ConfirmMemberPinResetInput,
  DeactivateMemberInput,
  ResetPinInput,
  SetChildInterfaceLevelInput,
  SetEmailInput,
  UpdatePermissionsInput,
} from '@banque-familiale/shared';
import {
  addMember,
  changeOwnPin,
  confirmMemberPinReset,
  deactivateMember,
  fetchMembers,
  requestMemberPinReset,
  requestPinResetNotification,
  resetMemberPin,
  setChildInterfaceLevel,
  setOwnEmail,
  updateMemberPermissions,
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

export function useResetMemberPin() {
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: ResetPinInput }) =>
      resetMemberPin(memberId, input),
  });
}

export function useRequestMemberPinReset() {
  return useMutation({ mutationFn: (memberId: string) => requestMemberPinReset(memberId) });
}

export function useConfirmMemberPinReset() {
  return useMutation({
    mutationFn: (input: ConfirmMemberPinResetInput) => confirmMemberPinReset(input),
  });
}

export function useRequestPinResetNotification() {
  return useMutation({ mutationFn: (memberId: string) => requestPinResetNotification(memberId) });
}

export function useSetChildInterfaceLevel() {
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: SetChildInterfaceLevelInput }) =>
      setChildInterfaceLevel(memberId, input),
    onSuccess: invalidateMembers,
  });
}

export function useUpdateMemberPermissions() {
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: UpdatePermissionsInput }) =>
      updateMemberPermissions(memberId, input),
    onSuccess: invalidateMembers,
  });
}

export function useDeactivateMember() {
  const invalidateMembers = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: DeactivateMemberInput }) =>
      deactivateMember(memberId, input),
    onSuccess: invalidateMembers,
  });
}
