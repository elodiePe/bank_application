import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const orderWithRelations = {
  requester: true,
  respondedBy: true,
  account: { include: { user: true } },
} satisfies Prisma.StockOrderInclude;

export function createStockRepository(prisma: Db) {
  return {
    listHoldingsForAccount(accountId: string) {
      return prisma.stockHolding.findMany({ where: { accountId }, orderBy: { symbol: 'asc' } });
    },

    findHolding(accountId: string, symbol: string) {
      return prisma.stockHolding.findUnique({ where: { accountId_symbol: { accountId, symbol } } });
    },

    async upsertHoldingAfterBuy(params: {
      accountId: string;
      symbol: string;
      companyName: string;
      addedQuantity: number;
      addedCostCents: number;
    }) {
      const existing = await prisma.stockHolding.findUnique({
        where: { accountId_symbol: { accountId: params.accountId, symbol: params.symbol } },
      });
      if (!existing) {
        return prisma.stockHolding.create({
          data: {
            accountId: params.accountId,
            symbol: params.symbol,
            companyName: params.companyName,
            quantity: params.addedQuantity,
            averageCostCents: Math.round(params.addedCostCents / params.addedQuantity),
          },
        });
      }
      const newQuantity = existing.quantity + params.addedQuantity;
      const newTotalCostCents = existing.averageCostCents * existing.quantity + params.addedCostCents;
      return prisma.stockHolding.update({
        where: { id: existing.id },
        data: {
          quantity: newQuantity,
          averageCostCents: Math.round(newTotalCostCents / newQuantity),
        },
      });
    },

    /** Reduces (or deletes, if it reaches ~0) a holding after a sell. Average cost is
     * left unchanged — only quantity moves on a sell. */
    reduceHoldingAfterSell(holdingId: string, soldQuantity: number, remainingQuantity: number) {
      if (remainingQuantity <= 1e-9) {
        return prisma.stockHolding.delete({ where: { id: holdingId } });
      }
      return prisma.stockHolding.update({ where: { id: holdingId }, data: { quantity: remainingQuantity } });
    },

    createOrder(data: Prisma.StockOrderCreateInput) {
      return prisma.stockOrder.create({ data, include: orderWithRelations });
    },

    findOrderByIdOrThrow(id: string) {
      return prisma.stockOrder.findUniqueOrThrow({ where: { id }, include: orderWithRelations });
    },

    updateOrderStatus(
      id: string,
      data: { status: 'APPROVED' | 'REJECTED' | 'CANCELLED'; respondedById?: string; transactionId?: string },
    ) {
      return prisma.stockOrder.update({
        where: { id },
        data: { ...data, respondedAt: new Date() },
        include: orderWithRelations,
      });
    },

    listPendingForFamily(familyId: string) {
      return prisma.stockOrder.findMany({
        where: { status: 'PENDING', requester: { familyId } },
        include: orderWithRelations,
        orderBy: { createdAt: 'desc' },
      });
    },

    listForUser(userId: string) {
      return prisma.stockOrder.findMany({
        where: { requesterId: userId },
        include: orderWithRelations,
        orderBy: { createdAt: 'desc' },
      });
    },

    /** Every individual lot (buy/sell/gift) behind a holding's current aggregate
     * quantity/cost — oldest first, so a running position can be traced chronologically. */
    listLotsForSymbol(accountId: string, symbol: string) {
      return prisma.transaction.findMany({
        where: {
          accountId,
          stockSymbol: symbol,
          type: { in: ['STOCK_BUY', 'STOCK_SELL', 'STOCK_GIFT'] },
        },
        orderBy: { occurredAt: 'asc' },
      });
    },
  };
}

export type StockRepository = ReturnType<typeof createStockRepository>;
