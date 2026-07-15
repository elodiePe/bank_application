export interface ChildBalanceSummary {
  accountId: string;
  userId: string;
  firstName: string;
  balanceCents: number;
  weeklyAllowanceCents: number;
}

export interface ParentDashboardOverview {
  totalBalanceCents: number;
  children: ChildBalanceSummary[];
  pendingRequestsCount: number;
}

export interface Sibling {
  userId: string;
  firstName: string;
}

export interface ChildDashboardOverview {
  balanceCents: number;
  weeklyAllowanceCents: number;
  siblings: Sibling[];
}
