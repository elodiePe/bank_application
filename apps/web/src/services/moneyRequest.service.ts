import type { CreateMoneyRequestInput, MoneyRequestSummary } from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function createMoneyRequest(input: CreateMoneyRequestInput): Promise<MoneyRequestSummary> {
  return apiPost<MoneyRequestSummary>('/money-requests', input);
}

export function fetchMyRequests(): Promise<MoneyRequestSummary[]> {
  return apiGet<MoneyRequestSummary[]>('/money-requests/mine');
}

export function fetchPendingRequests(): Promise<MoneyRequestSummary[]> {
  return apiGet<MoneyRequestSummary[]>('/money-requests/pending');
}

export function approveMoneyRequest(id: string): Promise<MoneyRequestSummary> {
  return apiPost<MoneyRequestSummary>(`/money-requests/${id}/approve`);
}

export function rejectMoneyRequest(id: string): Promise<MoneyRequestSummary> {
  return apiPost<MoneyRequestSummary>(`/money-requests/${id}/reject`);
}

export function cancelMoneyRequest(id: string): Promise<MoneyRequestSummary> {
  return apiPost<MoneyRequestSummary>(`/money-requests/${id}/cancel`);
}
