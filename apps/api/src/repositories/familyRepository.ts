import type { PrismaClient } from '@prisma/client';

export function createFamilyRepository(prisma: PrismaClient) {
  return {
    findWithMembers(familyId: string) {
      return prisma.family.findUnique({
        where: { id: familyId },
        include: {
          settings: true,
          users: { include: { childAccount: true } },
        },
      });
    },

    findByOwnerEmail(ownerEmail: string) {
      return prisma.family.findUnique({ where: { ownerEmail } });
    },

    findById(id: string) {
      return prisma.family.findUnique({ where: { id } });
    },

    create(params: { name: string; ownerEmail: string; ownerPasswordHash: string }) {
      return prisma.family.create({
        data: {
          name: params.name,
          ownerEmail: params.ownerEmail,
          ownerPasswordHash: params.ownerPasswordHash,
          settings: { create: { defaultInterestRateBps: 240, currency: 'CHF' } },
        },
      });
    },

    recordFailedOwnerLogin(id: string, { maxAttempts, lockoutMs }: { maxAttempts: number; lockoutMs: number }) {
      return prisma.$transaction(async (tx) => {
        const family = await tx.family.update({
          where: { id },
          data: { ownerFailedLoginAttempts: { increment: 1 } },
        });
        if (family.ownerFailedLoginAttempts >= maxAttempts) {
          return tx.family.update({
            where: { id },
            data: { ownerLockedUntil: new Date(Date.now() + lockoutMs) },
          });
        }
        return family;
      });
    },

    resetFailedOwnerLogins(id: string) {
      return prisma.family.update({
        where: { id },
        data: { ownerFailedLoginAttempts: 0, ownerLockedUntil: null },
      });
    },

    markOwnerEmailVerified(id: string) {
      return prisma.family.update({ where: { id }, data: { ownerEmailVerifiedAt: new Date() } });
    },

    /// Also clears any lockout — a successful reset proves the new owner of the inbox,
    /// so there is no reason to keep them locked out on the old failed attempts.
    setOwnerPasswordHash(id: string, ownerPasswordHash: string) {
      return prisma.family.update({
        where: { id },
        data: { ownerPasswordHash, ownerFailedLoginAttempts: 0, ownerLockedUntil: null },
      });
    },

    /// Cascades through every relation (users, accounts, transactions, requests,
    /// notifications, audit logs, ...) via the schema's onDelete: Cascade chain.
    delete(id: string) {
      return prisma.family.delete({ where: { id } });
    },
  };
}

export type FamilyRepository = ReturnType<typeof createFamilyRepository>;
