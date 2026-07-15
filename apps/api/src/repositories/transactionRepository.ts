import type { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import type { Db } from '../database/types.js';

const summaryInclude = {
  account: { include: { user: true } },
  reversedBy: true,
  sender: true,
  receiver: true,
  validatedBy: true,
} satisfies Prisma.TransactionInclude;

export interface TransactionSearchParams {
  familyId: string;
  childUserId?: string;
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy: 'occurredAt' | 'amountCents';
  sortDir: 'asc' | 'desc';
  skip: number;
  take: number;
}

export function createTransactionRepository(prisma: Db) {
  return {
    async listExternalRefs(accountId: string): Promise<string[]> {
      const rows = await prisma.transaction.findMany({
        where: { accountId, externalRef: { not: null } },
        select: { externalRef: true },
      });
      return rows.map((r) => r.externalRef).filter((ref): ref is string => ref !== null);
    },

    createMany(data: Prisma.TransactionCreateManyInput[]) {
      return prisma.transaction.createMany({ data });
    },

    create(data: Prisma.TransactionCreateInput) {
      return prisma.transaction.create({ data });
    },

    listRecentForFamily(familyId: string, limit: number) {
      return prisma.transaction.findMany({
        where: { account: { user: { familyId } } },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        include: summaryInclude,
      });
    },

    listRecentForAccount(accountId: string, limit: number) {
      return prisma.transaction.findMany({
        where: { accountId },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        include: summaryInclude,
      });
    },

    async search(params: TransactionSearchParams) {
      const where: Prisma.TransactionWhereInput = {
        account: {
          user: {
            familyId: params.familyId,
            ...(params.childUserId ? { id: params.childUserId } : {}),
          },
        },
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { comment: { contains: params.search, mode: 'insensitive' } } : {}),
        ...(params.dateFrom || params.dateTo
          ? {
              occurredAt: {
                ...(params.dateFrom ? { gte: params.dateFrom } : {}),
                ...(params.dateTo ? { lte: params.dateTo } : {}),
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { [params.sortBy]: params.sortDir },
          skip: params.skip,
          take: params.take,
          include: summaryInclude,
        }),
        prisma.transaction.count({ where }),
      ]);

      return { items, total };
    },

    findByIdOrThrow(id: string) {
      return prisma.transaction.findUniqueOrThrow({ where: { id } });
    },

    findByTransferGroupId(transferGroupId: string) {
      return prisma.transaction.findMany({ where: { transferGroupId } });
    },

    findReversalOf(transactionId: string) {
      return prisma.transaction.findFirst({ where: { reversalOfId: transactionId } });
    },
  };
}

export type TransactionRepository = ReturnType<typeof createTransactionRepository>;
