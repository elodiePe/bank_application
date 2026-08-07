import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const withRelations = {
  chore: { include: { childUser: true } },
  respondedBy: true,
} satisfies Prisma.ChoreCompletionInclude;

export function createChoreCompletionRepository(prisma: Db) {
  return {
    create(data: Prisma.ChoreCompletionCreateInput) {
      return prisma.choreCompletion.create({ data, include: withRelations });
    },

    findByIdOrThrow(id: string) {
      return prisma.choreCompletion.findUniqueOrThrow({ where: { id }, include: withRelations });
    },

    /** Whether this exact period already has a submission still counted (pending or already
     * approved) — a rejected one doesn't block a fresh attempt. */
    findActiveForPeriod(choreId: string, periodStart: Date) {
      return prisma.choreCompletion.findFirst({
        where: { choreId, periodStart, status: { in: ['PENDING', 'APPROVED'] } },
      });
    },

    /** Most recent submission for this exact period, whatever its status — used to show the
     * child what happened last time (including a past rejection). */
    findLatestForPeriod(choreId: string, periodStart: Date) {
      return prisma.choreCompletion.findFirst({
        where: { choreId, periodStart },
        orderBy: { createdAt: 'desc' },
      });
    },

    /** Batched form of findLatestForPeriod for a whole list of chores at once — one round trip
     * instead of one per chore. `since` should be the earliest of the chores' own period starts,
     * so the query only pulls rows that could possibly match one of them. Caller picks, per
     * choreId, the first row (already createdAt-desc) whose periodStart matches that chore's
     * own period. */
    listSince(choreIds: string[], since: Date) {
      if (choreIds.length === 0) return Promise.resolve([]);
      return prisma.choreCompletion.findMany({
        where: { choreId: { in: choreIds }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      });
    },

    listPendingForFamily(familyId: string) {
      return prisma.choreCompletion.findMany({
        where: { status: 'PENDING', chore: { familyId } },
        include: withRelations,
        orderBy: { createdAt: 'desc' },
      });
    },

    /** Every pending completion, across every family, that hasn't been reminded about yet —
     * scanned periodically to nudge parents toward approving/rejecting it. */
    listPendingWithoutReminder() {
      return prisma.choreCompletion.findMany({
        where: { status: 'PENDING', reminderSentAt: null },
        include: withRelations,
      });
    },

    markReminderSent(id: string, at: Date) {
      return prisma.choreCompletion.update({ where: { id }, data: { reminderSentAt: at } });
    },

    updateStatus(
      id: string,
      data: { status: 'APPROVED' | 'REJECTED'; respondedById: string; transactionId?: string },
    ) {
      return prisma.choreCompletion.update({
        where: { id },
        data: { ...data, respondedAt: new Date() },
        include: withRelations,
      });
    },
  };
}

export type ChoreCompletionRepository = ReturnType<typeof createChoreCompletionRepository>;
