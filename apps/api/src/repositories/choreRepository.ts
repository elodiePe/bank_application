import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const withChild = {
  childUser: true,
} satisfies Prisma.ChoreInclude;

export function createChoreRepository(prisma: Db) {
  return {
    create(data: Prisma.ChoreCreateInput) {
      return prisma.chore.create({ data, include: withChild });
    },

    findByIdOrThrow(id: string) {
      return prisma.chore.findUniqueOrThrow({ where: { id }, include: withChild });
    },

    listForFamily(familyId: string) {
      return prisma.chore.findMany({ where: { familyId }, include: withChild, orderBy: { createdAt: 'asc' } });
    },

    listActiveForChild(childUserId: string) {
      return prisma.chore.findMany({
        where: { childUserId, active: true },
        include: withChild,
        orderBy: { createdAt: 'asc' },
      });
    },

    /** Every active chore across every family — scanned periodically to find ones due for a
     * "not done yet" reminder. */
    listAllActive() {
      return prisma.chore.findMany({ where: { active: true }, include: withChild });
    },

    markReminderSent(id: string, at: Date) {
      return prisma.chore.update({ where: { id }, data: { lastReminderSentAt: at } });
    },

    update(
      id: string,
      data: {
        title?: string;
        rewardType?: 'MONEY' | 'POINTS';
        rewardCents?: number | null;
        rewardPoints?: number | null;
        active?: boolean;
      },
    ) {
      return prisma.chore.update({ where: { id }, data, include: withChild });
    },
  };
}

export type ChoreRepository = ReturnType<typeof createChoreRepository>;
