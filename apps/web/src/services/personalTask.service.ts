import type { CreatePersonalTaskInput, PersonalTaskSummary, UpdatePersonalTaskInput } from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './api.js';

export function fetchMyPersonalTasks(): Promise<PersonalTaskSummary[]> {
  return apiGet<PersonalTaskSummary[]>('/personal-tasks/mine');
}

export function createPersonalTask(input: CreatePersonalTaskInput): Promise<PersonalTaskSummary> {
  return apiPost<PersonalTaskSummary>('/personal-tasks', input);
}

export function updatePersonalTask(id: string, input: UpdatePersonalTaskInput): Promise<PersonalTaskSummary> {
  return apiPatch<PersonalTaskSummary>(`/personal-tasks/${id}`, input);
}

export function deletePersonalTask(id: string): Promise<void> {
  return apiDelete<void>(`/personal-tasks/${id}`);
}
