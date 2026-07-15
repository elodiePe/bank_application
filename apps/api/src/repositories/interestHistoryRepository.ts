import type { Db } from '../database/types.js';

export function createInterestHistoryRepository(prisma: Db) {
  return {
    findLatestForAccount(accountId: string) {
      return prisma.interestHistory.findFirst({
        where: { accountId },
        orderBy: { month: 'desc' },
      });
    },

    async listMonthsForAccount(accountId: string): Promise<Set<number>> {
      const rows = await prisma.interestHistory.findMany({
        where: { accountId },
        select: { month: true },
      });
      return new Set(rows.map((r) => r.month.getTime()));
    },

    create(params: { accountId: string; month: Date; rateBps: number; amountCents: number; transactionId: string }) {
      return prisma.interestHistory.create({ data: params });
    },
  };
}

export type InterestHistoryRepository = ReturnType<typeof createInterestHistoryRepository>;
