import type { PrismaClient } from '@prisma/client';

export function createMoneyRequestRepository(prisma: PrismaClient) {
  return {
    countPendingForFamily(familyId: string) {
      return prisma.moneyRequest.count({
        where: { status: 'PENDING', requester: { familyId } },
      });
    },
  };
}

export type MoneyRequestRepository = ReturnType<typeof createMoneyRequestRepository>;
