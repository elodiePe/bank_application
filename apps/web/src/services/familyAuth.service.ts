import type {
  ConfirmAccountDeletionInput,
  ConfirmPasswordResetInput,
  FamilySummary,
  LoginFamilyInput,
  RegisterFamilyInput,
  RequestPasswordResetInput,
  VerifyEmailInput,
} from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function registerFamily(input: RegisterFamilyInput): Promise<FamilySummary> {
  return apiPost<FamilySummary>('/family-auth/register', input);
}

export function loginFamily(input: LoginFamilyInput): Promise<FamilySummary> {
  return apiPost<FamilySummary>('/family-auth/login', input);
}

export function logoutFamily(): Promise<void> {
  return apiPost<void>('/family-auth/logout');
}

export function fetchCurrentFamily(): Promise<FamilySummary> {
  return apiGet<FamilySummary>('/family-auth/me');
}

export function verifyEmail(input: VerifyEmailInput): Promise<void> {
  return apiPost<void>('/family-auth/verify-email', input);
}

export function requestAccountDeletion(): Promise<void> {
  return apiPost<void>('/family-auth/request-deletion');
}

export function confirmAccountDeletion(input: ConfirmAccountDeletionInput): Promise<void> {
  return apiPost<void>('/family-auth/confirm-deletion', input);
}

export function requestFamilyPasswordReset(input: RequestPasswordResetInput): Promise<void> {
  return apiPost<void>('/family-auth/request-password-reset', input);
}

export function confirmFamilyPasswordReset(input: ConfirmPasswordResetInput): Promise<void> {
  return apiPost<void>('/family-auth/confirm-password-reset', input);
}
