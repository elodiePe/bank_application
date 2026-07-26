import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const withRelations = {
  raisedBy: true,
  resolvedBy: true,
} satisfies Prisma.DisputeInclude;

export function createDisputeRepository(prisma: Db) {
  return {
    countPendingForFamily(familyId: string) {
      return prisma.dispute.count({
        where: { status: 'PENDING', raisedBy: { familyId } },
      });
    },

    findOpenForTransaction(transactionId: string) {
      return prisma.dispute.findFirst({
        where: { transactionId, status: 'PENDING' },
      });
    },

    create(data: Prisma.DisputeCreateInput) {
      return prisma.dispute.create({ data, include: withRelations });
    },

    findByIdOrThrow(id: string) {
      return prisma.dispute.findUniqueOrThrow({ where: { id }, include: withRelations });
    },

    updateStatus(id: string, data: { status: 'DISMISSED' | 'RESOLVED'; resolvedById: string }) {
      return prisma.dispute.update({
        where: { id },
        data: { ...data, resolvedAt: new Date() },
        include: withRelations,
      });
    },

    listPendingForFamily(familyId: string) {
      return prisma.dispute.findMany({
        where: { status: 'PENDING', raisedBy: { familyId } },
        include: withRelations,
        orderBy: { createdAt: 'desc' },
      });
    },

    listForUser(userId: string) {
      return prisma.dispute.findMany({
        where: { raisedById: userId },
        include: withRelations,
        orderBy: { createdAt: 'desc' },
      });
    },
  };
}

export type DisputeRepository = ReturnType<typeof createDisputeRepository>;
