import type { ParentDashboardOverview, TransactionSummary } from '@banque-familiale/shared';
import { apiGet } from './api.js';

export function fetchParentOverview(): Promise<ParentDashboardOverview> {
  return apiGet<ParentDashboardOverview>('/dashboard/overview');
}

export function fetchRecentTransactions(limit = 15): Promise<TransactionSummary[]> {
  return apiGet<TransactionSummary[]>(`/dashboard/recent-transactions?limit=${limit}`);
}
