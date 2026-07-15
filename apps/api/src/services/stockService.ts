import type { PrismaClient } from '@prisma/client';
import type {
  CreateStockOrderInput,
  GiftStockInput,
  StockLotSummary,
  StockOrderSummary,
  StockPortfolioOverview,
  StockQuote,
  StockSearchResult,
} from '@banque-familiale/shared';
import { createStockRepository } from '../repositories/stockRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createStockPriceService } from './stockPriceService.js';
import { createNotificationService } from './notificationService.js';
import {
  ForbiddenError,
  InsufficientFundsError,
  InvalidRequestStateError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';

type OrderWithRelations = {
  id: string;
  requesterId: string;
  requester: { firstName: string; familyId: string };
  accountId: string;
  account: { user: { firstName: string } };
  type: 'BUY' | 'SELL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  symbol: string;
  companyName: string;
  quantity: number;
  estimatedPriceCents: number;
  comment: string | null;
  createdAt: Date;
  respondedBy: { firstName: string } | null;
  respondedAt: Date | null;
};

function toOrderSummary(o: OrderWithRelations): StockOrderSummary {
  return {
    id: o.id,
    requesterId: o.requesterId,
    requesterFirstName: o.requester.firstName,
    accountId: o.accountId,
    childFirstName: o.account.user.firstName,
    type: o.type,
    status: o.status,
    symbol: o.symbol,
    companyName: o.companyName,
    quantity: o.quantity,
    estimatedPriceCents: o.estimatedPriceCents,
    comment: o.comment,
    createdAt: o.createdAt.toISOString(),
    respondedByFirstName: o.respondedBy?.firstName ?? null,
    respondedAt: o.respondedAt?.toISOString() ?? null,
  };
}

export function createStockService(prisma: PrismaClient) {
  const stockRepo = createStockRepository(prisma);
  const priceService = createStockPriceService();
  const notificationService = createNotificationService(prisma);
  const accountRepo = createChildAccountRepository(prisma);
  const userRepo = createUserRepository(prisma);

  async function getPortfolioForAccount(accountId: string): Promise<StockPortfolioOverview> {
    const holdings = await stockRepo.listHoldingsForAccount(accountId);
    const summaries = await Promise.all(
      holdings.map(async (h) => {
        try {
          const quote = await priceService.getQuote(h.symbol, h.companyName);
          const marketValueCents = Math.round(quote.currentPriceCents * h.quantity);
          const costCents = Math.round(h.averageCostCents * h.quantity);
          return {
            id: h.id,
            symbol: h.symbol,
            companyName: h.companyName,
            quantity: h.quantity,
            averageCostCents: h.averageCostCents,
            firstPurchaseAt: h.firstPurchaseAt.toISOString(),
            currentPriceCents: quote.currentPriceCents,
            marketValueCents,
            gainLossCents: marketValueCents - costCents,
            gainLossPercent: costCents > 0 ? ((marketValueCents - costCents) / costCents) * 100 : 0,
          };
        } catch {
          // Market data momentarily unavailable — still show the position, just without
          // a live valuation, rather than hiding it or failing the whole portfolio view.
          return {
            id: h.id,
            symbol: h.symbol,
            companyName: h.companyName,
            quantity: h.quantity,
            averageCostCents: h.averageCostCents,
            firstPurchaseAt: h.firstPurchaseAt.toISOString(),
            currentPriceCents: null,
            marketValueCents: null,
            gainLossCents: null,
            gainLossPercent: null,
          };
        }
      }),
    );

    const totalMarketValueCents = summaries.reduce((sum, s) => sum + (s.marketValueCents ?? 0), 0);
    const totalCostCents = holdings.reduce((sum, h) => sum + Math.round(h.averageCostCents * h.quantity), 0);

    return { holdings: summaries, totalMarketValueCents, totalCostCents };
  }

  const LOT_TYPE: Record<string, StockLotSummary['type']> = {
    STOCK_BUY: 'BUY',
    STOCK_SELL: 'SELL',
    STOCK_GIFT: 'GIFT',
  };

  async function getLotsForAccount(accountId: string, symbol: string): Promise<StockLotSummary[]> {
    const rows = await stockRepo.listLotsForSymbol(accountId, symbol);

    // A SELL lot needs no live price (it's a completed, closed event); a BUY/GIFT lot's
    // gain/loss needs the current quote — fetch it once, reused for every such row.
    const needsQuote = rows.some((r) => r.type !== 'STOCK_SELL');
    const currentPriceCents = needsQuote ? await priceService.getQuote(symbol).then((q) => q.currentPriceCents).catch(() => null) : null;

    return rows.map((r) => {
      const quantity = r.stockQuantity ?? 0;
      const pricePerShareCents = quantity > 0 ? Math.round(r.amountCents / quantity) : 0;
      const isClosedSale = r.type === 'STOCK_SELL';
      const gainLossCents =
        !isClosedSale && currentPriceCents !== null ? Math.round((currentPriceCents - pricePerShareCents) * quantity) : null;

      return {
        id: r.id,
        type: LOT_TYPE[r.type] ?? 'BUY',
        occurredAt: r.occurredAt.toISOString(),
        quantity,
        pricePerShareCents,
        totalCents: r.amountCents,
        gainLossCents,
        gainLossPercent: gainLossCents !== null && r.amountCents > 0 ? (gainLossCents / r.amountCents) * 100 : null,
        comment: r.comment,
      };
    });
  }

  return {
    search(query: string): Promise<StockSearchResult[]> {
      return priceService.search(query);
    },

    getQuote(symbol: string): Promise<StockQuote> {
      return priceService.getQuote(symbol.toUpperCase());
    },

    async getPortfolio(userId: string): Promise<StockPortfolioOverview> {
      const account = await accountRepo.findByUserId(userId);
      if (!account) throw new NotFoundError('Compte introuvable');
      return getPortfolioForAccount(account.id);
    },

    async getPortfolioForFamilyAccount(accountId: string, familyId: string): Promise<StockPortfolioOverview> {
      const account = await accountRepo.findByIdOrThrow(accountId);
      if (account.user.familyId !== familyId) {
        throw new ForbiddenError("Ce compte n'appartient pas à votre famille");
      }
      return getPortfolioForAccount(accountId);
    },

    async getLots(userId: string, symbol: string): Promise<StockLotSummary[]> {
      const account = await accountRepo.findByUserId(userId);
      if (!account) throw new NotFoundError('Compte introuvable');
      return getLotsForAccount(account.id, symbol.toUpperCase());
    },

    async getLotsForFamilyAccount(accountId: string, symbol: string, familyId: string): Promise<StockLotSummary[]> {
      const account = await accountRepo.findByIdOrThrow(accountId);
      if (account.user.familyId !== familyId) {
        throw new ForbiddenError("Ce compte n'appartient pas à votre famille");
      }
      return getLotsForAccount(accountId, symbol.toUpperCase());
    },

    async createOrder(params: {
      requesterId: string;
      familyId: string;
      input: CreateStockOrderInput;
    }): Promise<StockOrderSummary> {
      const account = await accountRepo.findByUserId(params.requesterId);
      if (!account) throw new ForbiddenError('Seul un enfant peut passer un ordre en bourse.');

      const quote = await priceService.getQuote(params.input.symbol, params.input.companyName);

      if (params.input.type === 'SELL') {
        const holding = await stockRepo.findHolding(account.id, quote.symbol);
        if (!holding || holding.quantity < params.input.quantity) {
          throw new ValidationError('Tu ne possèdes pas assez de cette action pour la vendre.');
        }
      }

      const created = await stockRepo.createOrder({
        requester: { connect: { id: params.requesterId } },
        account: { connect: { id: account.id } },
        type: params.input.type,
        symbol: quote.symbol,
        companyName: quote.companyName,
        quantity: params.input.quantity,
        estimatedPriceCents: quote.currentPriceCents,
        comment: params.input.comment ?? null,
      });

      await notificationService.notifyParentsOfStockOrder({
        familyId: params.familyId,
        requesterFirstName: created.requester.firstName,
        type: created.type,
        symbol: created.symbol,
        quantity: created.quantity,
      });

      return toOrderSummary(created);
    },

    async listPendingForFamily(familyId: string): Promise<StockOrderSummary[]> {
      const orders = await stockRepo.listPendingForFamily(familyId);
      return orders.map(toOrderSummary);
    },

    async listMine(userId: string): Promise<StockOrderSummary[]> {
      const orders = await stockRepo.listForUser(userId);
      return orders.map(toOrderSummary);
    },

    async approve(params: { orderId: string; actorId: string; actorFamilyId: string }): Promise<StockOrderSummary> {
      const order = await stockRepo.findOrderByIdOrThrow(params.orderId);
      if (order.status !== 'PENDING') throw new InvalidRequestStateError();
      if (order.requester.familyId !== params.actorFamilyId) throw new ForbiddenError();

      // Never trust the price shown to the child at request time — re-fetch a live quote
      // right before actually moving money. Fetched outside the DB transaction below since
      // it's a network call and must not hold a row lock while waiting on it.
      const quote = await priceService.getQuote(order.symbol, order.companyName);
      const totalCents = Math.round(quote.currentPriceCents * order.quantity);

      const updated = await prisma.$transaction(async (tx) => {
        const txAccountRepo = createChildAccountRepository(tx);
        const txStockRepo = createStockRepository(tx);
        const txTransactionRepo = createTransactionRepository(tx);

        const account = await txAccountRepo.findByIdOrThrow(order.accountId);

        let transactionId: string;
        if (order.type === 'BUY') {
          if (totalCents > account.balanceCents) throw new InsufficientFundsError();
          const balanceAfter = account.balanceCents - totalCents;
          const transaction = await txTransactionRepo.create({
            account: { connect: { id: order.accountId } },
            type: 'STOCK_BUY',
            status: 'COMPLETED',
            amountCents: totalCents,
            balanceBeforeCents: account.balanceCents,
            balanceAfterCents: balanceAfter,
            comment: `Achat de ${order.quantity} ${order.symbol}`,
            stockSymbol: order.symbol,
            stockQuantity: order.quantity,
            validatedBy: { connect: { id: params.actorId } },
            occurredAt: new Date(),
          });
          await txAccountRepo.updateBalance(order.accountId, balanceAfter);
          await txStockRepo.upsertHoldingAfterBuy({
            accountId: order.accountId,
            symbol: order.symbol,
            companyName: order.companyName,
            addedQuantity: order.quantity,
            addedCostCents: totalCents,
          });
          transactionId = transaction.id;
        } else {
          const holding = await txStockRepo.findHolding(order.accountId, order.symbol);
          if (!holding || holding.quantity < order.quantity) {
            throw new ValidationError('La quantité détenue a changé, cette vente ne peut plus être exécutée.');
          }
          const balanceAfter = account.balanceCents + totalCents;
          const transaction = await txTransactionRepo.create({
            account: { connect: { id: order.accountId } },
            type: 'STOCK_SELL',
            status: 'COMPLETED',
            amountCents: totalCents,
            balanceBeforeCents: account.balanceCents,
            balanceAfterCents: balanceAfter,
            comment: `Vente de ${order.quantity} ${order.symbol}`,
            stockSymbol: order.symbol,
            stockQuantity: order.quantity,
            validatedBy: { connect: { id: params.actorId } },
            occurredAt: new Date(),
          });
          await txAccountRepo.updateBalance(order.accountId, balanceAfter);
          await txStockRepo.reduceHoldingAfterSell(holding.id, order.quantity, holding.quantity - order.quantity);
          transactionId = transaction.id;
        }

        return txStockRepo.updateOrderStatus(order.id, {
          status: 'APPROVED',
          respondedById: params.actorId,
          transactionId,
        });
      });

      await notificationService.notifyStockOrderApproved({
        requesterId: order.requesterId,
        type: order.type,
        symbol: order.symbol,
        quantity: order.quantity,
        approvedByFirstName: updated.respondedBy?.firstName ?? '',
      });

      return toOrderSummary(updated);
    },

    async reject(params: { orderId: string; actorId: string; actorFamilyId: string }): Promise<StockOrderSummary> {
      const order = await stockRepo.findOrderByIdOrThrow(params.orderId);
      if (order.status !== 'PENDING') throw new InvalidRequestStateError();
      if (order.requester.familyId !== params.actorFamilyId) throw new ForbiddenError();

      const updated = await stockRepo.updateOrderStatus(order.id, {
        status: 'REJECTED',
        respondedById: params.actorId,
      });

      await notificationService.notifyStockOrderRejected({
        requesterId: order.requesterId,
        type: order.type,
        symbol: order.symbol,
        quantity: order.quantity,
        rejectedByFirstName: updated.respondedBy?.firstName ?? '',
      });

      return toOrderSummary(updated);
    },

    /** A parent grants shares directly to a child — no approval step, and unlike a BUY
     * order, the child's cash balance is never touched. Cost basis is the live market
     * price at the moment of the gift, so future gain/loss reflects appreciation since
     * the gift rather than an artificial "free money" gain from a zero cost basis. */
    async giftShares(params: {
      actorId: string;
      actorFamilyId: string;
      input: GiftStockInput;
    }): Promise<StockOrderSummary> {
      const account = await accountRepo.findByIdOrThrow(params.input.accountId);
      if (account.user.familyId !== params.actorFamilyId) {
        throw new ForbiddenError("Ce compte n'appartient pas à votre famille");
      }
      if (account.user.role !== 'CHILD') {
        throw new ValidationError('Seul un compte enfant peut recevoir des actions.');
      }

      const quote = await priceService.getQuote(params.input.symbol, params.input.companyName);
      const totalCents = Math.round(quote.currentPriceCents * params.input.quantity);

      const result = await prisma.$transaction(async (tx) => {
        const txStockRepo = createStockRepository(tx);
        const txTransactionRepo = createTransactionRepository(tx);

        const transaction = await txTransactionRepo.create({
          account: { connect: { id: account.id } },
          type: 'STOCK_GIFT',
          status: 'COMPLETED',
          amountCents: totalCents,
          // No cash moves — balance before/after are identical, unlike a BUY/SELL.
          balanceBeforeCents: account.balanceCents,
          balanceAfterCents: account.balanceCents,
          comment: params.input.comment ?? `Cadeau de ${params.input.quantity} ${quote.symbol}`,
          stockSymbol: quote.symbol,
          stockQuantity: params.input.quantity,
          validatedBy: { connect: { id: params.actorId } },
          occurredAt: new Date(),
        });

        await txStockRepo.upsertHoldingAfterBuy({
          accountId: account.id,
          symbol: quote.symbol,
          companyName: quote.companyName,
          addedQuantity: params.input.quantity,
          addedCostCents: totalCents,
        });

        return transaction;
      });

      const actor = await userRepo.findById(params.actorId);

      await notificationService.notifyStockGiftReceived({
        userId: account.userId,
        symbol: quote.symbol,
        quantity: params.input.quantity,
        givenByFirstName: actor?.firstName ?? '',
        transactionId: result.id,
      });

      return {
        id: result.id,
        requesterId: params.actorId,
        requesterFirstName: actor?.firstName ?? '',
        accountId: account.id,
        childFirstName: account.user.firstName,
        type: 'BUY',
        status: 'APPROVED',
        symbol: quote.symbol,
        companyName: quote.companyName,
        quantity: params.input.quantity,
        estimatedPriceCents: quote.currentPriceCents,
        comment: params.input.comment ?? null,
        createdAt: result.occurredAt.toISOString(),
        respondedByFirstName: null,
        respondedAt: null,
      };
    },

    async cancel(params: { orderId: string; actorId: string }): Promise<StockOrderSummary> {
      const order = await stockRepo.findOrderByIdOrThrow(params.orderId);
      if (order.status !== 'PENDING') throw new InvalidRequestStateError();
      if (order.requesterId !== params.actorId) {
        throw new ForbiddenError('Seul le demandeur peut annuler son ordre.');
      }

      const updated = await stockRepo.updateOrderStatus(order.id, {
        status: 'CANCELLED',
        respondedById: params.actorId,
      });
      return toOrderSummary(updated);
    },
  };
}

export type StockService = ReturnType<typeof createStockService>;
