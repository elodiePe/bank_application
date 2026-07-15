import type { PrismaClient } from '@prisma/client';

export function createUserRepository(prisma: PrismaClient) {
  return {
    findById(userId: string) {
      return prisma.user.findUnique({ where: { id: userId } });
    },

    findByEmail(email: string) {
      return prisma.user.findUnique({ where: { email } });
    },

    /** Active members only — used for the public login picker. */
    listFamilyMembers(familyId: string) {
      return prisma.user.findMany({
        where: { familyId, deactivatedAt: null },
        select: { id: true, firstName: true, role: true, pinHash: true },
        orderBy: { createdAt: 'asc' },
      });
    },

    /** Everyone, including deactivated members — used by the family management panel. */
    listAllFamilyMembers(familyId: string) {
      return prisma.user.findMany({
        where: { familyId },
        select: {
          id: true,
          firstName: true,
          role: true,
          email: true,
          pinHash: true,
          passwordHash: true,
          deactivatedAt: true,
        },
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

    setEmail(userId: string, email: string) {
      return prisma.user.update({ where: { id: userId }, data: { email } });
    },

    setPasswordHash(userId: string, passwordHash: string) {
      return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    },

    setPinHash(userId: string, pinHash: string) {
      return prisma.user.update({ where: { id: userId }, data: { pinHash } });
    },

    deactivate(userId: string) {
      return prisma.user.update({ where: { id: userId }, data: { deactivatedAt: new Date() } });
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
