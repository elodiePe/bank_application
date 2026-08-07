import type { PrismaClient } from '@prisma/client';

/// GDPR Art. 20 (data portability) / nLPD equivalent — a PARENT-only dump of everything
/// the family's own members generated. Deliberately excludes pure internal/technical
/// bookkeeping that isn't meaningful "personal data" for portability purposes: auth
/// artifacts (RefreshSession, PushSubscription, password/PIN hashes), the AuditLog, and
/// the various notification-dedup/occurrence-status overlay tables.
export function createExportService(prisma: PrismaClient) {
  return {
    async exportFamilyData(familyId: string) {
      const [family, settings, users] = await Promise.all([
        prisma.family.findUnique({
          where: { id: familyId },
          select: {
            name: true,
            createdAt: true,
            ownerEmail: true,
            ownerEmailVerifiedAt: true,
            termsAcceptedAt: true,
            onboardingCompletedAt: true,
          },
        }),
        prisma.settings.findUnique({ where: { familyId }, omit: { familyId: true } }),
        prisma.user.findMany({
          where: { familyId },
          select: {
            id: true,
            role: true,
            firstName: true,
            email: true,
            interfaceLevel: true,
            showPointsBalance: true,
            isAdmin: true,
            canManageMoney: true,
            canManageActions: true,
            canManageSettings: true,
            canManageFamily: true,
            deactivatedAt: true,
            createdAt: true,
          },
        }),
      ]);

      const userIds = users.map((u) => u.id);

      const childAccounts = await prisma.childAccount.findMany({ where: { userId: { in: userIds } } });
      const accountIds = childAccounts.map((a) => a.id);

      const [
        transactions,
        moneyRequests,
        disputes,
        notifications,
        chores,
        choreCompletions,
        personalTasks,
        savingsGoals,
        pointsRewardGoals,
        mealPlanSlots,
        mealPlanRotationOrder,
        laundryTypes,
        customNotifications,
        shoppingListItems,
        stockHoldings,
      ] = await Promise.all([
        prisma.transaction.findMany({ where: { accountId: { in: accountIds } } }),
        prisma.moneyRequest.findMany({ where: { requesterId: { in: userIds } } }),
        prisma.dispute.findMany({ where: { raisedById: { in: userIds } } }),
        prisma.notification.findMany({ where: { userId: { in: userIds } } }),
        prisma.chore.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.choreCompletion.findMany({ where: { chore: { familyId } } }),
        prisma.personalTask.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.savingsGoal.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.pointsRewardGoal.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.mealPlanSlot.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.mealPlanRotationOrder.findUnique({ where: { familyId }, omit: { familyId: true } }),
        prisma.laundryType.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.customNotification.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.shoppingListItem.findMany({ where: { familyId }, omit: { familyId: true } }),
        prisma.stockHolding.findMany({ where: { accountId: { in: accountIds } } }),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        family,
        settings,
        members: users,
        childAccounts,
        transactions,
        moneyRequests,
        disputes,
        notifications,
        chores,
        choreCompletions,
        personalTasks,
        savingsGoals,
        pointsRewardGoals,
        mealPlanSlots,
        mealPlanRotationOrder,
        laundryTypes,
        customNotifications,
        shoppingListItems,
        stockHoldings,
      };
    },
  };
}

export type ExportService = ReturnType<typeof createExportService>;
