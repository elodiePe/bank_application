import type { PrismaClient } from '@prisma/client';

export function createUserRepository(prisma: PrismaClient) {
  return {
    findById(userId: string) {
      return prisma.user.findUnique({ where: { id: userId } });
    },

    listFamilyMembers(familyId: string) {
      return prisma.user.findMany({
        where: { familyId },
        select: { id: true, firstName: true, role: true, pinHash: true },
        orderBy: { createdAt: 'asc' },
      });
    },

    recordFailedLogin(userId: string, { maxAttempts, lockoutMs }: { maxAttempts: number; lockoutMs: number }) {
      return prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { failedLoginAttempts: { increment: 1 } },
        });
        if (user.failedLoginAttempts >= maxAttempts) {
          return tx.user.update({
            where: { id: userId },
            data: { lockedUntil: new Date(Date.now() + lockoutMs) },
          });
        }
        return user;
      });
    },

    resetFailedLogins(userId: string) {
      return prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
