import type {
  AddMemberInput,
  BootstrapParentInput,
  ChangePinInput,
  ConfirmMemberPinResetInput,
  DeactivateMemberInput,
  FamilyMemberDetail,
  ResetPinInput,
  SetChildInterfaceLevelInput,
  SetEmailInput,
  UpdatePermissionsInput,
} from '@banque-familiale/shared';
import { apiGet, apiPatch, apiPost } from './api.js';

export function fetchMembers(): Promise<FamilyMemberDetail[]> {
  return apiGet<FamilyMemberDetail[]>('/members');
}

export function bootstrapParent(input: BootstrapParentInput): Promise<FamilyMemberDetail> {
  return apiPost<FamilyMemberDetail>('/members/bootstrap-parent', input);
}

export function setOwnEmail(input: SetEmailInput): Promise<void> {
  return apiPost<void>('/members/me/email', input);
}

export function changeOwnPin(input: ChangePinInput): Promise<void> {
  return apiPost<void>('/members/me/change-pin', input);
}

export function addMember(input: AddMemberInput): Promise<FamilyMemberDetail> {
  return apiPost<FamilyMemberDetail>('/members', input);
}

export function resetMemberPin(memberId: string, input: ResetPinInput): Promise<void> {
  return apiPost<void>(`/members/${memberId}/reset-pin`, input);
}

export function deactivateMember(memberId: string, input: DeactivateMemberInput): Promise<void> {
  return apiPost<void>(`/members/${memberId}/deactivate`, input);
}

export function requestMemberPinReset(memberId: string): Promise<void> {
  return apiPost<void>(`/members/${memberId}/request-pin-reset`);
}

export function confirmMemberPinReset(input: ConfirmMemberPinResetInput): Promise<void> {
  return apiPost<void>('/members/pin-reset/confirm', input);
}

export function requestPinResetNotification(memberId: string): Promise<void> {
  return apiPost<void>(`/members/${memberId}/request-pin-reset-notification`);
}

export function setChildInterfaceLevel(
  memberId: string,
  input: SetChildInterfaceLevelInput,
): Promise<FamilyMemberDetail> {
  return apiPatch<FamilyMemberDetail>(`/members/${memberId}/interface-level`, input);
}

export function updateMemberPermissions(
  memberId: string,
  input: UpdatePermissionsInput,
): Promise<FamilyMemberDetail> {
  return apiPatch<FamilyMemberDetail>(`/members/${memberId}/permissions`, input);
}
