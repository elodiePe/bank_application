export interface ChildBalanceSummary {
  accountId: string;
  userId: string;
  firstName: string;
  balanceCents: number;
  weeklyAllowanceCents: number;
  /** Cumulative score from chores rewarded in points instead of money. */
  pointsBalance: number;
}

export interface ParentDashboardOverview {
  totalBalanceCents: number;
  children: ChildBalanceSummary[];
  pendingRequestsCount: number;
  /// False only for the very first parent, until they finish the guided setup wizard.
  onboardingCompleted: boolean;
}

export interface Sibling {
  userId: string;
  firstName: string;
}

export interface ChildDashboardOverview {
  balanceCents: number;
  weeklyAllowanceCents: number;
  pointsBalance: number;
  siblings: Sibling[];
}
