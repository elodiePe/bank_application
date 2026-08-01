import type {
  CreateLaundryTypeInput,
  LaundryOccurrenceSummary,
  LaundryTypeSummary,
  ReorderLaundryTypesInput,
  SetLaundryOccurrenceStatusInput,
  UpdateLaundryTypeInput,
} from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api.js';

export function fetchLaundryTypes(): Promise<LaundryTypeSummary[]> {
  return apiGet<LaundryTypeSummary[]>('/laundry');
}

export function fetchLaundryUpcoming(days = 7): Promise<LaundryOccurrenceSummary[]> {
  return apiGet<LaundryOccurrenceSummary[]>(`/laundry/upcoming?days=${days}`);
}

export function createLaundryType(input: CreateLaundryTypeInput): Promise<LaundryTypeSummary> {
  return apiPost<LaundryTypeSummary>('/laundry', input);
}

export function updateLaundryType(id: string, input: UpdateLaundryTypeInput): Promise<LaundryTypeSummary> {
  return apiPut<LaundryTypeSummary>(`/laundry/${id}`, input);
}

export function deleteLaundryType(id: string): Promise<void> {
  return apiDelete<void>(`/laundry/${id}`);
}

export function reorderLaundryTypes(input: ReorderLaundryTypesInput): Promise<void> {
  return apiPut<void>('/laundry/reorder', input);
}

export function setLaundryOccurrenceStatus(input: SetLaundryOccurrenceStatusInput): Promise<void> {
  return apiPatch<void>('/laundry/occurrence-status', input);
}
