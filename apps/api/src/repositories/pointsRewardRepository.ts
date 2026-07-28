import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

export function createPointsRewardRepository(prisma: Db) {
  return {
    listForFamily(familyId: string) {
      return prisma.pointsRewardGoal.findMany({
        where: { familyId },
        orderBy: [{ childUserId: 'asc' }, { pointsRequired: 'asc' }],
      });
    },

    create(data: Prisma.PointsRewardGoalCreateInput) {
      return prisma.pointsRewardGoal.create({ data });
    },

    findByIdOrThrow(id: string) {
      return prisma.pointsRewardGoal.findUniqueOrThrow({ where: { id } });
    },

    async delete(id: string) {
      await prisma.pointsRewardGoal.delete({ where: { id } });
    },
  };
}

export type PointsRewardRepository = ReturnType<typeof createPointsRewardRepository>;
