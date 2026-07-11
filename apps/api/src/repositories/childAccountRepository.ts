import type { PrismaClient } from '@prisma/client';

export function createChildAccountRepository(prisma: PrismaClient) {
  return {
    findByIdOrThrow(id: string) {
      return prisma.childAccount.findUniqueOrThrow({ where: { id } });
    },

    findByUserId(userId: string) {
      return prisma.childAccount.findUnique({ where: { userId } });
    },

    updateBalance(id: string, balanceCents: number) {
      return prisma.childAccount.update({ where: { id }, data: { balanceCents } });
    },
  };
}

export type ChildAccountRepository = ReturnType<typeof createChildAccountRepository>;
