import type { ParentDashboardOverview, TransactionSummary } from '@banque-familiale/shared';
import type { FamilyRepository } from '../repositories/familyRepository.js';
import type { MoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import type { TransactionRepository } from '../repositories/transactionRepository.js';

export function createDashboardService(deps: {
  familyRepository: FamilyRepository;
  moneyRequestRepository: MoneyRequestRepository;
  transactionRepository: TransactionRepository;
}) {
  return {
    async getParentOverview(familyId: string): Promise<ParentDashboardOverview> {
      const family = await deps.familyRepository.findWithMembers(familyId);
      if (!family) {
        throw new Error(`Family not found: ${familyId}`);
      }

      const children = family.users
        .filter((u) => u.role === 'CHILD' && u.childAccount)
        .map((u) => ({
          accountId: u.childAccount!.id,
          userId: u.id,
          firstName: u.firstName,
          balanceCents: u.childAccount!.balanceCents,
        }));

      const totalBalanceCents = children.reduce((sum, c) => sum + c.balanceCents, 0);
      const pendingRequestsCount = await deps.moneyRequestRepository.countPendingForFamily(familyId);

      return { totalBalanceCents, children, pendingRequestsCount };
    },

    async getRecentFamilyTransactions(familyId: string, limit = 15): Promise<TransactionSummary[]> {
      const transactions = await deps.transactionRepository.listRecentForFamily(familyId, limit);
      return transactions.map((t) => ({
        id: t.id,
        childFirstName: t.account.user.firstName,
        type: t.type,
        status: t.status,
        amountCents: t.amountCents,
        balanceAfterCents: t.balanceAfterCents,
        comment: t.comment,
        occurredAt: t.occurredAt.toISOString(),
      }));
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
