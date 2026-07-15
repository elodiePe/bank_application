import type { Db } from '../database/types.js';

export function createAllowanceHistoryRepository(prisma: Db) {
  return {
    async listWeekStartsForAccount(accountId: string): Promise<Set<number>> {
      const rows = await prisma.allowanceHistory.findMany({
        where: { accountId },
        select: { weekStart: true },
      });
      return new Set(rows.map((r) => r.weekStart.getTime()));
    },

    create(params: { accountId: string; weekStart: Date; amountCents: number; transactionId: string }) {
      return prisma.allowanceHistory.create({ data: params });
    },
  };
}

export type AllowanceHistoryRepository = ReturnType<typeof createAllowanceHistoryRepository>;
