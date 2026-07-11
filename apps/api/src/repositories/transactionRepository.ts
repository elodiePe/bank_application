import type { Prisma, PrismaClient } from '@prisma/client';

export function createTransactionRepository(prisma: PrismaClient) {
  return {
    async listExternalRefs(accountId: string): Promise<string[]> {
      const rows = await prisma.transaction.findMany({
        where: { accountId, externalRef: { not: null } },
        select: { externalRef: true },
      });
      return rows.map((r) => r.externalRef).filter((ref): ref is string => ref !== null);
    },

    createMany(data: Prisma.TransactionCreateManyInput[]) {
      return prisma.transaction.createMany({ data });
    },

    listRecentForFamily(familyId: string, limit: number) {
      return prisma.transaction.findMany({
        where: { account: { user: { familyId } } },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        include: { account: { include: { user: true } } },
      });
    },
  };
}

export type TransactionRepository = ReturnType<typeof createTransactionRepository>;
