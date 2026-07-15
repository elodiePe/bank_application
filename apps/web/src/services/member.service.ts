import type {
  AddMemberInput,
  BootstrapParentInput,
  ChangePasswordInput,
  ChangePinInput,
  ConfirmMemberPasswordResetInput,
  DeactivateMemberInput,
  FamilyMemberDetail,
  ResetPasswordInput,
  ResetPinInput,
  SetEmailInput,
} from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function fetchMembers(): Promise<FamilyMemberDetail[]> {
  return apiGet<FamilyMemberDetail[]>('/members');
}

export function bootstrapParent(input: BootstrapParentInput): Promise<FamilyMemberDetail> {
  return apiPost<FamilyMemberDetail>('/members/bootstrap-parent', input);
}

export function setOwnEmail(input: SetEmailInput): Promise<void> {
  return apiPost<void>('/members/me/email', input);
}

export function changeOwnPassword(input: ChangePasswordInput): Promise<void> {
  return apiPost<void>('/members/me/change-password', input);
}

export function changeOwnPin(input: ChangePinInput): Promise<void> {
  return apiPost<void>('/members/me/change-pin', input);
}

export function addMember(input: AddMemberInput): Promise<FamilyMemberDetail> {
  return apiPost<FamilyMemberDetail>('/members', input);
}

export function resetMemberPassword(memberId: string, input: ResetPasswordInput): Promise<void> {
  return apiPost<void>(`/members/${memberId}/reset-password`, input);
}

export function resetMemberPin(memberId: string, input: ResetPinInput): Promise<void> {
  return apiPost<void>(`/members/${memberId}/reset-pin`, input);
}

export function deactivateMember(memberId: string, input: DeactivateMemberInput): Promise<void> {
  return apiPost<void>(`/members/${memberId}/deactivate`, input);
}

export function requestMemberPasswordReset(memberId: string): Promise<void> {
  return apiPost<void>(`/members/${memberId}/request-password-reset`);
}

export function confirmMemberPasswordReset(input: ConfirmMemberPasswordResetInput): Promise<void> {
  return apiPost<void>('/members/reset-password/confirm', input);
}

export function requestPinResetNotification(memberId: string): Promise<void> {
  return apiPost<void>(`/members/${memberId}/request-pin-reset-notification`);
}
