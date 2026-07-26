import type { CreateDisputeInput, DisputeSummary } from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function createDispute(input: CreateDisputeInput): Promise<DisputeSummary> {
  return apiPost<DisputeSummary>('/disputes', input);
}

export function fetchMyDisputes(): Promise<DisputeSummary[]> {
  return apiGet<DisputeSummary[]>('/disputes/mine');
}

export function fetchPendingDisputes(): Promise<DisputeSummary[]> {
  return apiGet<DisputeSummary[]>('/disputes/pending');
}

export function dismissDispute(id: string): Promise<DisputeSummary> {
  return apiPost<DisputeSummary>(`/disputes/${id}/dismiss`);
}

export function resolveDispute(id: string): Promise<DisputeSummary> {
  return apiPost<DisputeSummary>(`/disputes/${id}/resolve`);
}
