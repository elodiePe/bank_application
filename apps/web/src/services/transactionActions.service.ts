import type {
  CorrectionInput,
  CurrencyInput,
  DepositInput,
  FamilySettings,
  InterestRateInput,
  TransferInput,
  WeeklyAllowanceInput,
  WithdrawalInput,
} from '@banque-familiale/shared';
import { apiGet, apiPost, apiPut } from './api.js';

export function deposit(input: DepositInput) {
  return apiPost('/transactions/deposit', input);
}

export function withdrawal(input: WithdrawalInput) {
  return apiPost('/transactions/withdrawal', input);
}

export function transfer(input: TransferInput) {
  return apiPost('/transactions/transfer', input);
}

export function correctTransaction(transactionId: string, input: CorrectionInput) {
  return apiPost(`/transactions/${transactionId}/correct`, input);
}

export function fetchSettings(): Promise<FamilySettings> {
  return apiGet<FamilySettings>('/settings');
}

export function updateInterestRate(input: InterestRateInput): Promise<FamilySettings> {
  return apiPut<FamilySettings>('/settings/interest-rate', input);
}

export function updateCurrency(input: CurrencyInput): Promise<FamilySettings> {
  return apiPut<FamilySettings>('/settings/currency', input);
}

export function setWeeklyAllowance(accountId: string, input: WeeklyAllowanceInput): Promise<void> {
  return apiPut<void>(`/children/${accountId}/allowance`, input);
}
