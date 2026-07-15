import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const withRelations = {
  requester: true,
  targetUser: true,
  respondedBy: true,
} satisfies Prisma.MoneyRequestInclude;

export function createMoneyRequestRepository(prisma: Db) {
  return {
    countPendingForFamily(familyId: string) {
      return prisma.moneyRequest.count({
        where: { status: 'PENDING', requester: { familyId } },
      });
    },

    create(data: Prisma.MoneyRequestCreateInput) {
      return prisma.moneyRequest.create({ data, include: withRelations });
    },

    findByIdOrThrow(id: string) {
      return prisma.moneyRequest.findUniqueOrThrow({ where: { id }, include: withRelations });
    },

    updateStatus(
      id: string,
      data: { status: 'APPROVED' | 'REJECTED' | 'CANCELLED'; respondedById?: string; transferGroupId?: string },
    ) {
      return prisma.moneyRequest.update({
        where: { id },
        data: { ...data, respondedAt: new Date() },
        include: withRelations,
      });
    },

    listPendingForFamily(familyId: string) {
      return prisma.moneyRequest.findMany({
        where: { status: 'PENDING', requester: { familyId } },
        include: withRelations,
        orderBy: { createdAt: 'desc' },
      });
    },

    /** Requests this user made, or requests (from a sibling) targeting them. */
    listForUser(userId: string) {
      return prisma.moneyRequest.findMany({
        where: { OR: [{ requesterId: userId }, { targetUserId: userId }] },
        include: withRelations,
        orderBy: { createdAt: 'desc' },
      });
    },
  };
}

export type MoneyRequestRepository = ReturnType<typeof createMoneyRequestRepository>;
