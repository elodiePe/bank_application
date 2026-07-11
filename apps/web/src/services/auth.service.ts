import type {
  AuthenticatedUser,
  FamilyMemberSummary,
  LoginPasswordInput,
  LoginPinInput,
} from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function fetchFamilyMembers(): Promise<FamilyMemberSummary[]> {
  return apiGet<FamilyMemberSummary[]>('/auth/members');
}

export function loginWithPassword(input: LoginPasswordInput): Promise<AuthenticatedUser> {
  return apiPost<AuthenticatedUser>('/auth/login-password', input);
}

export function loginWithPin(input: LoginPinInput): Promise<AuthenticatedUser> {
  return apiPost<AuthenticatedUser>('/auth/login-pin', input);
}

export function logout(): Promise<void> {
  return apiPost<void>('/auth/logout');
}

export function fetchCurrentUser(): Promise<AuthenticatedUser> {
  return apiGet<AuthenticatedUser>('/auth/me');
}
