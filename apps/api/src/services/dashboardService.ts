import type {
  ChildDashboardOverview,
  ParentDashboardOverview,
  TransactionListQuery,
  TransactionListResult,
  TransactionSummary,
} from '@banque-familiale/shared';
import type { FamilyRepository } from '../repositories/familyRepository.js';
import type { MoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import type { TransactionRepository, TransactionSearchParams } from '../repositories/transactionRepository.js';
import type { ChildAccountRepository } from '../repositories/childAccountRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { toTransactionSummary } from '../utils/transactionMapper.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function toSearchParams(
  familyId: string,
  query: TransactionListQuery,
  forcedChildUserId?: string,
): TransactionSearchParams {
  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

  return {
    familyId,
    childUserId: forcedChildUserId ?? query.childUserId,
    search: query.search?.trim() || undefined,
    type: query.type,
    status: query.status,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    sortBy: query.sortBy ?? 'occurredAt',
    sortDir: query.sortDir ?? 'desc',
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function createDashboardService(deps: {
  familyRepository: FamilyRepository;
  moneyRequestRepository: MoneyRequestRepository;
  transactionRepository: TransactionRepository;
  childAccountRepository: ChildAccountRepository;
  userRepository: UserRepository;
}) {
  return {
    async getParentOverview(familyId: string): Promise<ParentDashboardOverview> {
      const family = await deps.familyRepository.findWithMembers(familyId);
      if (!family) {
        throw new Error(`Family not found: ${familyId}`);
      }

      const children = family.users
        .filter((u) => u.role === 'CHILD' && u.childAccount && u.deactivatedAt === null)
        .map((u) => ({
          accountId: u.childAccount!.id,
          userId: u.id,
          firstName: u.firstName,
          balanceCents: u.childAccount!.balanceCents,
          weeklyAllowanceCents: u.childAccount!.weeklyAllowanceCents,
        }));

      const totalBalanceCents = children.reduce((sum, c) => sum + c.balanceCents, 0);
      const pendingRequestsCount = await deps.moneyRequestRepository.countPendingForFamily(familyId);

      return { totalBalanceCents, children, pendingRequestsCount };
    },

    async getRecentFamilyTransactions(familyId: string, limit = 15): Promise<TransactionSummary[]> {
      const transactions = await deps.transactionRepository.listRecentForFamily(familyId, limit);
      return transactions.map(toTransactionSummary);
    },

    async getChildOverview(userId: string, familyId: string): Promise<ChildDashboardOverview> {
      const account = await deps.childAccountRepository.findByUserId(userId);
      if (!account) throw new NotFoundError('Compte introuvable');

      const members = await deps.userRepository.listFamilyMembers(familyId);
      const siblings = members
        .filter((m) => m.role === 'CHILD' && m.id !== userId)
        .map((m) => ({ userId: m.id, firstName: m.firstName }));

      return {
        balanceCents: account.balanceCents,
        weeklyAllowanceCents: account.weeklyAllowanceCents,
        siblings,
      };
    },

    async getMyTransactions(userId: string, limit = 15): Promise<TransactionSummary[]> {
      const account = await deps.childAccountRepository.findByUserId(userId);
      if (!account) throw new NotFoundError('Compte introuvable');

      const transactions = await deps.transactionRepository.listRecentForAccount(account.id, limit);
      return transactions.map(toTransactionSummary);
    },

    async searchFamilyTransactions(familyId: string, query: TransactionListQuery): Promise<TransactionListResult> {
      const params = toSearchParams(familyId, query);
      const { items, total } = await deps.transactionRepository.search(params);
      return {
        items: items.map(toTransactionSummary),
        total,
        page: Math.floor(params.skip / params.take) + 1,
        pageSize: params.take,
      };
    },

    async searchMyTransactions(
      userId: string,
      familyId: string,
      query: TransactionListQuery,
    ): Promise<TransactionListResult> {
      // childUserId is always forced to the caller — a child can never search a sibling's history.
      const params = toSearchParams(familyId, query, userId);
      const { items, total } = await deps.transactionRepository.search(params);
      return {
        items: items.map(toTransactionSummary),
        total,
        page: Math.floor(params.skip / params.take) + 1,
        pageSize: params.take,
      };
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
