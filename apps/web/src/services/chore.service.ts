import type {
  ChoreCompletionSummary,
  ChoreSummary,
  CreateChoreInput,
  UpdateChoreInput,
} from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './api.js';

export function fetchFamilyChores(): Promise<ChoreSummary[]> {
  return apiGet<ChoreSummary[]>('/chores');
}

export function fetchMyChores(): Promise<ChoreSummary[]> {
  return apiGet<ChoreSummary[]>('/chores/mine');
}

export function fetchPendingChoreCompletions(): Promise<ChoreCompletionSummary[]> {
  return apiGet<ChoreCompletionSummary[]>('/chores/pending');
}

export function createChore(input: CreateChoreInput): Promise<ChoreSummary> {
  return apiPost<ChoreSummary>('/chores', input);
}

export function updateChore(choreId: string, input: UpdateChoreInput): Promise<ChoreSummary> {
  return apiPatch<ChoreSummary>(`/chores/${choreId}`, input);
}

export function deleteChore(choreId: string): Promise<void> {
  return apiDelete<void>(`/chores/${choreId}`);
}

export function completeChore(choreId: string): Promise<ChoreCompletionSummary> {
  return apiPost<ChoreCompletionSummary>(`/chores/${choreId}/complete`);
}

export function postponeChore(choreId: string): Promise<ChoreSummary> {
  return apiPost<ChoreSummary>(`/chores/${choreId}/postpone`);
}

export function approveChoreCompletion(completionId: string): Promise<ChoreCompletionSummary> {
  return apiPost<ChoreCompletionSummary>(`/chores/completions/${completionId}/approve`);
}

export function rejectChoreCompletion(completionId: string): Promise<ChoreCompletionSummary> {
  return apiPost<ChoreCompletionSummary>(`/chores/completions/${completionId}/reject`);
}
