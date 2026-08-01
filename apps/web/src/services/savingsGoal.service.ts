import type { SavingsGoalSummary, UpsertSavingsGoalInput } from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPut } from './api.js';

export function fetchMySavingsGoal(): Promise<SavingsGoalSummary | null> {
  return apiGet<SavingsGoalSummary | null>('/savings-goal/mine');
}

export function upsertMySavingsGoal(input: UpsertSavingsGoalInput): Promise<SavingsGoalSummary> {
  return apiPut<SavingsGoalSummary>('/savings-goal/mine', input);
}

export function deleteMySavingsGoal(): Promise<void> {
  return apiDelete<void>('/savings-goal/mine');
}
