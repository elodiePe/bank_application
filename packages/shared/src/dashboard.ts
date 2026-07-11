export interface ChildBalanceSummary {
  accountId: string;
  userId: string;
  firstName: string;
  balanceCents: number;
}

export interface ParentDashboardOverview {
  totalBalanceCents: number;
  children: ChildBalanceSummary[];
  pendingRequestsCount: number;
}
