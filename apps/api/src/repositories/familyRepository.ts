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
          settings: {
            create: {
              defaultInterestRateBps: 240,
              currency: 'CHF',
              stocksEnabled: false,
              mealPlanEnabled: false,
              shoppingListEnabled: false,
              laundryEnabled: false,
            },
          },
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

    markOnboardingComplete(id: string) {
      return prisma.family.update({ where: { id }, data: { onboardingCompletedAt: new Date() } });
    },

    /// Also clears any lockout — a successful reset proves the new owner of the inbox,
    /// so there is no reason to keep them locked out on the old failed attempts.
    setOwnerPasswordHash(id: string, ownerPasswordHash: string) {
      return prisma.family.update({
        where: { id },
        data: { ownerPasswordHash, ownerFailedLoginAttempts: 0, ownerLockedUntil: null },
      });
    },

    /// Most family data cascades automatically via onDelete: Cascade chains rooted at
    /// User/ChildAccount (transactions, requests, notifications, audit logs, chores, custom
    /// notifications, shopping list, ...). But a handful of models scope themselves to a
    /// family with a loose `familyId` field and no actual foreign key — see their own model
    /// comments in schema.prisma — so Postgres has nothing to cascade through for them. Left
    /// alone, deleting the family would leave these as permanent orphaned rows pointing at a
    /// familyId that no longer exists. They're removed explicitly, in the same transaction as
    /// the family delete itself.
    delete(id: string) {
      return prisma.$transaction(async (tx) => {
        await tx.pointsRewardGoal.deleteMany({ where: { familyId: id } });
        await tx.mealPlanSlot.deleteMany({ where: { familyId: id } });
        await tx.mealPlanRotationOrder.deleteMany({ where: { familyId: id } });
        await tx.mealPlanChoreConfig.deleteMany({ where: { familyId: id } });
        await tx.mealPlanOccurrenceStatus.deleteMany({ where: { familyId: id } });
        await tx.laundryType.deleteMany({ where: { familyId: id } });
        await tx.laundryOccurrenceStatus.deleteMany({ where: { familyId: id } });
        return tx.family.delete({ where: { id } });
      });
    },
  };
}

export type FamilyRepository = ReturnType<typeof createFamilyRepository>;
