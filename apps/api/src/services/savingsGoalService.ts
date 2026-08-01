import type { PrismaClient, SavingsGoal } from '@prisma/client';
import type { SavingsGoalSummary } from '@banque-familiale/shared';
import { createSavingsGoalRepository } from '../repositories/savingsGoalRepository.js';

function toSummary(goal: SavingsGoal): SavingsGoalSummary {
  return {
    id: goal.id,
    title: goal.title,
    targetCents: goal.targetCents,
    photoDataUrl: goal.photoDataUrl,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export function createSavingsGoalService(prisma: PrismaClient) {
  const repo = createSavingsGoalRepository(prisma);

  return {
    async getMine(userId: string): Promise<SavingsGoalSummary | null> {
      const goal = await repo.findForUser(userId);
      return goal ? toSummary(goal) : null;
    },

    /** Create-or-replace, since a child has at most one goal at a time. `photoDataUrl` left
     * `undefined` keeps whatever photo (if any) was already there — only an explicit `null`
     * clears it, distinguishing "didn't touch the photo" from "removed the photo". */
    async upsertMine(params: {
      familyId: string;
      userId: string;
      title: string;
      targetCents: number;
      photoDataUrl?: string | null;
    }): Promise<SavingsGoalSummary> {
      const existing = await repo.findForUser(params.userId);
      const photoDataUrl = params.photoDataUrl === undefined ? (existing?.photoDataUrl ?? null) : params.photoDataUrl;

      const goal = await repo.upsert({
        familyId: params.familyId,
        userId: params.userId,
        title: params.title,
        targetCents: params.targetCents,
        photoDataUrl,
      });
      return toSummary(goal);
    },

    async deleteMine(userId: string): Promise<void> {
      await repo.delete(userId);
    },
  };
}

export type SavingsGoalService = ReturnType<typeof createSavingsGoalService>;
