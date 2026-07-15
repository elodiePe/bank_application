import type {
  ChildDashboardOverview,
  ParentDashboardOverview,
  TransactionSummary,
} from '@banque-familiale/shared';
import { apiGet } from './api.js';

export function fetchParentOverview(): Promise<ParentDashboardOverview> {
  return apiGet<ParentDashboardOverview>('/dashboard/overview');
}

export function fetchRecentTransactions(limit = 15): Promise<TransactionSummary[]> {
  return apiGet<TransactionSummary[]>(`/dashboard/recent-transactions?limit=${limit}`);
}

export function fetchChildOverview(): Promise<ChildDashboardOverview> {
  return apiGet<ChildDashboardOverview>('/dashboard/me/overview');
}

export function fetchMyTransactions(limit = 15): Promise<TransactionSummary[]> {
  return apiGet<TransactionSummary[]>(`/dashboard/me/transactions?limit=${limit}`);
}
