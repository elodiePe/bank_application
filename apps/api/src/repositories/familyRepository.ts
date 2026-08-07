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

    findByStripeCustomerId(stripeCustomerId: string) {
      return prisma.family.findUnique({ where: { stripeCustomerId } });
    },

    /// Set once, the first time a family starts a checkout — a family keeps the same Stripe
    /// customer across plan changes/cancellations, so this never needs to be cleared.
    setStripeCustomerId(id: string, stripeCustomerId: string) {
      return prisma.family.update({ where: { id }, data: { stripeCustomerId } });
    },

    /// The only writer of subscriptionTier/stripeSubscriptionStatus/etc. — always called from
    /// a verified Stripe webhook event (see stripeService), never from a client request.
    updateSubscriptionFromStripe(
      id: string,
      data: {
        subscriptionTier: 'ESSENTIEL' | 'FAMILLE' | 'GRANDE_FAMILLE';
        stripeSubscriptionId: string | null;
        stripeSubscriptionStatus: string | null;
        stripePriceId: string | null;
        stripeCurrentPeriodEnd: Date | null;
      },
    ) {
      return prisma.family.update({ where: { id }, data });
    },

    /// Starts the 30-day countdown to deletion — only called once, the moment a previously
    /// paid subscription drops out of active/trialing status.
    startPaymentGracePeriod(id: string) {
      return prisma.family.update({ where: { id }, data: { paymentGracePeriodStartedAt: new Date() } });
    },

    /// Called once payment recovers (subscription becomes active again) — cancels the
    /// countdown entirely, including any J-7 reminder already sent.
    clearPaymentGracePeriod(id: string) {
      return prisma.family.update({
        where: { id },
        data: { paymentGracePeriodStartedAt: null, paymentGraceReminderSentAt: null },
      });
    },

    markPaymentGraceReminderSent(id: string) {
      return prisma.family.update({ where: { id }, data: { paymentGraceReminderSentAt: new Date() } });
    },

    /// Families whose 30-day grace period is still running — used by the daily check.
    listInPaymentGracePeriod() {
      return prisma.family.findMany({ where: { paymentGracePeriodStartedAt: { not: null } } });
    },

    create(params: { name: string; ownerEmail: string; ownerPasswordHash: string }) {
      return prisma.family.create({
        data: {
          name: params.name,
          ownerEmail: params.ownerEmail,
          ownerPasswordHash: params.ownerPasswordHash,
          // Schema validation (registerFamilySchema) already requires acceptedTerms === true
          // before this is ever called — recording the timestamp here, not the boolean, is
          // what actually demonstrates consent (GDPR Art. 7(1)).
          termsAcceptedAt: new Date(),
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

    setOwnerMfaChallenge(id: string, { codeHash, expiresAt }: { codeHash: string; expiresAt: Date }) {
      return prisma.family.update({
        where: { id },
        data: { ownerMfaCodeHash: codeHash, ownerMfaCodeExpiresAt: expiresAt, ownerMfaCodeAttempts: 0 },
      });
    },

    recordFailedOwnerMfaAttempt(id: string, maxAttempts: number) {
      return prisma.$transaction(async (tx) => {
        const family = await tx.family.update({
          where: { id },
          data: { ownerMfaCodeAttempts: { increment: 1 } },
        });
        // Too many wrong codes: invalidate the challenge outright rather than let it keep
        // being guessed until it naturally expires — forces a fresh login (and a fresh code).
        if (family.ownerMfaCodeAttempts >= maxAttempts) {
          return tx.family.update({
            where: { id },
            data: { ownerMfaCodeHash: null, ownerMfaCodeExpiresAt: null, ownerMfaCodeAttempts: 0 },
          });
        }
        return family;
      });
    },

    clearOwnerMfaChallenge(id: string) {
      return prisma.family.update({
        where: { id },
        data: { ownerMfaCodeHash: null, ownerMfaCodeExpiresAt: null, ownerMfaCodeAttempts: 0 },
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
