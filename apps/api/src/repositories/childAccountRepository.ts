import type { Db } from '../database/types.js';

export function createChildAccountRepository(prisma: Db) {
  return {
    findByIdOrThrow(id: string) {
      return prisma.childAccount.findUniqueOrThrow({ where: { id }, include: { user: true } });
    },

    findByUserId(userId: string) {
      return prisma.childAccount.findUnique({ where: { userId } });
    },

    updateBalance(id: string, balanceCents: number) {
      return prisma.childAccount.update({ where: { id }, data: { balanceCents } });
    },

    listAll() {
      return prisma.childAccount.findMany({ include: { user: true } });
    },

    listWithAllowanceEnabled() {
      return prisma.childAccount.findMany({
        where: { weeklyAllowanceCents: { gt: 0 }, allowanceEnabledSince: { not: null } },
        include: { user: true },
      });
    },

    updateWeeklyAllowance(id: string, weeklyAllowanceCents: number, allowanceEnabledSince: Date | null) {
      return prisma.childAccount.update({
        where: { id },
        data: { weeklyAllowanceCents, allowanceEnabledSince },
      });
    },

    setInterestEligibleSince(id: string, interestEligibleSince: Date) {
      return prisma.childAccount.update({ where: { id }, data: { interestEligibleSince } });
    },
  };
}

export type ChildAccountRepository = ReturnType<typeof createChildAccountRepository>;
