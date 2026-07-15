import type { TransactionListQuery, TransactionListResult } from '@banque-familiale/shared';
import { apiGet } from './api.js';

function buildQueryString(query: TransactionListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export function fetchFamilyTimeline(query: TransactionListQuery): Promise<TransactionListResult> {
  return apiGet<TransactionListResult>(`/dashboard/transactions/search?${buildQueryString(query)}`);
}

export function fetchMyTimeline(query: TransactionListQuery): Promise<TransactionListResult> {
  return apiGet<TransactionListResult>(`/dashboard/me/transactions/search?${buildQueryString(query)}`);
}
