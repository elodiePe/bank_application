import type { Db } from '../database/types.js';

export function createSavingsGoalRepository(prisma: Db) {
  return {
    findForUser(userId: string) {
      return prisma.savingsGoal.findUnique({ where: { userId } });
    },

    upsert(params: {
      familyId: string;
      userId: string;
      title: string;
      targetCents: number;
      photoDataUrl: string | null;
    }) {
      return prisma.savingsGoal.upsert({
        where: { userId: params.userId },
        create: {
          familyId: params.familyId,
          userId: params.userId,
          title: params.title,
          targetCents: params.targetCents,
          photoDataUrl: params.photoDataUrl,
        },
        update: {
          title: params.title,
          targetCents: params.targetCents,
          photoDataUrl: params.photoDataUrl,
        },
      });
    },

    async delete(userId: string) {
      await prisma.savingsGoal.deleteMany({ where: { userId } });
    },
  };
}

export type SavingsGoalRepository = ReturnType<typeof createSavingsGoalRepository>;
