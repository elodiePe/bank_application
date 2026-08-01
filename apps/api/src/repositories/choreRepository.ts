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

    /** Excludes chores whose `startsOn` (set by "reporter à demain") is still in the future —
     * a postponed chore stays invisible to the child until its date arrives. */
    listActiveForChild(childUserId: string, now: Date) {
      return prisma.chore.findMany({
        where: { childUserId, active: true, OR: [{ startsOn: null }, { startsOn: { lte: now } }] },
        include: withChild,
        orderBy: { createdAt: 'asc' },
      });
    },

    /** Every active, already-started chore across every family — scanned periodically to find
     * ones due for a "not done yet" reminder. Same startsOn exclusion as listActiveForChild. */
    listAllActive(now: Date) {
      return prisma.chore.findMany({
        where: { active: true, OR: [{ startsOn: null }, { startsOn: { lte: now } }] },
        include: withChild,
      });
    },

    markReminderSent(id: string, at: Date) {
      return prisma.chore.update({ where: { id }, data: { lastReminderSentAt: at } });
    },

    markEveningReminderSent(id: string, at: Date) {
      return prisma.chore.update({ where: { id }, data: { lastEveningReminderSentAt: at } });
    },

    delete(id: string) {
      return prisma.chore.delete({ where: { id } });
    },

    update(
      id: string,
      data: {
        title?: string;
        rewardType?: 'MONEY' | 'POINTS' | 'NONE';
        rewardCents?: number | null;
        rewardPoints?: number | null;
        active?: boolean;
        requiresApproval?: boolean;
      },
    ) {
      return prisma.chore.update({ where: { id }, data, include: withChild });
    },
  };
}

export type ChoreRepository = ReturnType<typeof createChoreRepository>;
