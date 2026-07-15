import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../utils/errors.js';

const QUOTES: Record<string, { c: number; pc: number }> = {
  AAPL: { c: 150, pc: 145 }, // gain scenario
  TSLA: { c: 200, pc: 210 }, // loss scenario
  RICH: { c: 100_000, pc: 100_000 }, // priced far beyond any test balance
};

// Stubs the market-data provider entirely rather than mocking fetch/https — stockService
// only depends on this module's public shape (search/getQuote), so the test stays valid
// regardless of which HTTP client the real implementation uses under the hood.
vi.mock('./stockPriceService.js', () => ({
  createStockPriceService: () => ({
    async search(query: string) {
      return query.toLowerCase().includes('apple') ? [{ symbol: 'AAPL', companyName: 'Apple Inc' }] : [];
    },
    async getQuote(symbol: string, companyNameHint?: string) {
      const data = QUOTES[symbol];
      if (!data || data.c <= 0) throw new NotFoundError('Symbole boursier introuvable.');
      return {
        symbol,
        companyName: companyNameHint ?? symbol,
        currentPriceCents: Math.round(data.c * 100),
        previousCloseCents: Math.round(data.pc * 100),
        changePercent: data.pc > 0 ? ((data.c - data.pc) / data.pc) * 100 : 0,
      };
    },
  }),
}));

import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createStockService, type StockService } from './stockService.js';
import { ForbiddenError, InsufficientFundsError, ValidationError } from '../utils/errors.js';

describe('stockService (seeded demo family)', () => {
  let db: TestDb;
  let service: StockService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createStockService(db.prisma);
    // The seed starts every child at a 0 balance — fund the ones used below so a BUY
    // order actually has something to spend, independent of the "insufficient funds"
    // test below which relies on staying underfunded.
    await db.prisma.childAccount.updateMany({
      where: { userId: { in: ['demo-elodie', 'demo-matthieu'] } },
      data: { balanceCents: 1_000_000 },
    });
  });

  afterAll(() => db.teardown());

  it('searches for a symbol and returns simplified results', async () => {
    const results = await service.search('apple');
    expect(results).toEqual([{ symbol: 'AAPL', companyName: 'Apple Inc' }]);
  });

  it('gets a live quote converted to cents', async () => {
    const quote = await service.getQuote('AAPL');
    expect(quote).toMatchObject({
      symbol: 'AAPL',
      currentPriceCents: 15_000,
      previousCloseCents: 14_500,
    });
    expect(quote.changePercent).toBeCloseTo(((150 - 145) / 145) * 100, 5);
  });

  it('a child creates a pending BUY order', async () => {
    const order = await service.createOrder({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'AAPL', companyName: 'Apple Inc', quantity: 2, comment: 'Pour tester' },
    });

    expect(order).toMatchObject({
      requesterFirstName: 'Elodie',
      type: 'BUY',
      status: 'PENDING',
      symbol: 'AAPL',
      companyName: 'Apple Inc',
      quantity: 2,
      estimatedPriceCents: 15_000,
    });
  });

  it('refuses a SELL order when the child does not own the stock', async () => {
    await expect(
      service.createOrder({
        requesterId: 'demo-elodie',
        familyId: 'demo-family',
        input: { type: 'SELL', symbol: 'TSLA', quantity: 1 },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('a parent approves a BUY order: debits the balance and creates the holding', async () => {
    const accountBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });

    const order = await service.createOrder({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'AAPL', companyName: 'Apple Inc', quantity: 3 },
    });

    const approved = await service.approve({
      orderId: order.id,
      actorId: 'demo-papa',
      actorFamilyId: 'demo-family',
    });

    expect(approved.status).toBe('APPROVED');
    expect(approved.respondedByFirstName).toBe('Papa');

    const accountAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });
    expect(accountAfter.balanceCents).toBe(accountBefore.balanceCents - 3 * 15_000);

    const holding = await db.prisma.stockHolding.findUniqueOrThrow({
      where: { accountId_symbol: { accountId: accountAfter.id, symbol: 'AAPL' } },
    });
    expect(holding.quantity).toBe(3);
    expect(holding.averageCostCents).toBe(15_000);

    const transaction = await db.prisma.transaction.findFirstOrThrow({
      where: { accountId: accountAfter.id, type: 'STOCK_BUY' },
    });
    expect(transaction.amountCents).toBe(3 * 15_000);
  });

  it('refuses to approve a BUY order that would overdraw the balance, leaving state untouched', async () => {
    const order = await service.createOrder({
      requesterId: 'demo-matthieu',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'RICH', companyName: 'Expensive Corp', quantity: 1 },
    });
    const accountBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-matthieu' } });

    await expect(
      service.approve({ orderId: order.id, actorId: 'demo-papa', actorFamilyId: 'demo-family' }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    const accountAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-matthieu' } });
    expect(accountAfter.balanceCents).toBe(accountBefore.balanceCents);
    const holding = await db.prisma.stockHolding.findUnique({
      where: { accountId_symbol: { accountId: accountAfter.id, symbol: 'RICH' } },
    });
    expect(holding).toBeNull();

    const stillPending = await db.prisma.stockOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(stillPending.status).toBe('PENDING');
  });

  it('a parent approves a SELL order: credits the balance and reduces the holding', async () => {
    // demo-elodie already holds 3 AAPL from the earlier test in this file.
    const accountBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });

    const sellOrder = await service.createOrder({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      input: { type: 'SELL', symbol: 'AAPL', quantity: 2 },
    });
    const approved = await service.approve({
      orderId: sellOrder.id,
      actorId: 'demo-maman',
      actorFamilyId: 'demo-family',
    });

    expect(approved.status).toBe('APPROVED');

    const accountAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });
    expect(accountAfter.balanceCents).toBe(accountBefore.balanceCents + 2 * 15_000);

    const holding = await db.prisma.stockHolding.findUniqueOrThrow({
      where: { accountId_symbol: { accountId: accountAfter.id, symbol: 'AAPL' } },
    });
    expect(holding.quantity).toBe(1);
  });

  it('deletes the holding entirely when a SELL order liquidates the full position', async () => {
    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: 'demo-elodie' } });
    // 1 AAPL share remains from the previous test.
    const sellOrder = await service.createOrder({
      requesterId: 'demo-elodie',
      familyId: 'demo-family',
      input: { type: 'SELL', symbol: 'AAPL', quantity: 1 },
    });
    await service.approve({ orderId: sellOrder.id, actorId: 'demo-papa', actorFamilyId: 'demo-family' });

    const holding = await db.prisma.stockHolding.findUnique({
      where: { accountId_symbol: { accountId: account.id, symbol: 'AAPL' } },
    });
    expect(holding).toBeNull();
  });

  it('a parent rejects a pending order', async () => {
    const order = await service.createOrder({
      requesterId: 'demo-damien',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'TSLA', companyName: 'Tesla', quantity: 1 },
    });
    const rejected = await service.reject({
      orderId: order.id,
      actorId: 'demo-papa',
      actorFamilyId: 'demo-family',
    });
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.respondedByFirstName).toBe('Papa');
  });

  it('the requester cancels their own pending order', async () => {
    const order = await service.createOrder({
      requesterId: 'demo-damien',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'TSLA', companyName: 'Tesla', quantity: 1 },
    });
    const cancelled = await service.cancel({ orderId: order.id, actorId: 'demo-damien' });
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('refuses to let someone other than the requester cancel an order', async () => {
    const order = await service.createOrder({
      requesterId: 'demo-damien',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'TSLA', companyName: 'Tesla', quantity: 1 },
    });
    await expect(service.cancel({ orderId: order.id, actorId: 'demo-elodie' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('computes market value and gain/loss for each holding using a live quote', async () => {
    const buyOrder = await service.createOrder({
      requesterId: 'demo-matthieu',
      familyId: 'demo-family',
      input: { type: 'BUY', symbol: 'TSLA', companyName: 'Tesla', quantity: 2 },
    });
    await service.approve({ orderId: buyOrder.id, actorId: 'demo-papa', actorFamilyId: 'demo-family' });

    const portfolio = await service.getPortfolio('demo-matthieu');
    const holding = portfolio.holdings.find((h) => h.symbol === 'TSLA');
    expect(holding).toBeDefined();
    // Bought and priced at the same 200/share mock quote — no gain/loss expected.
    expect(holding?.marketValueCents).toBe(2 * 20_000);
    expect(holding?.gainLossCents).toBe(0);
  });

  describe('giftShares', () => {
    it('gives a child shares directly, without touching their cash balance or requiring approval', async () => {
      const account = await db.prisma.childAccount.findFirstOrThrow({ where: { userId: 'demo-elodie' } });
      const balanceBefore = account.balanceCents;

      const gift = await service.giftShares({
        actorId: 'demo-papa',
        actorFamilyId: 'demo-family',
        input: { accountId: account.id, symbol: 'AAPL', companyName: 'Apple Inc', quantity: 3 },
      });

      expect(gift).toMatchObject({
        type: 'BUY',
        status: 'APPROVED',
        symbol: 'AAPL',
        quantity: 3,
        requesterFirstName: 'Papa',
        childFirstName: 'Elodie',
      });

      const accountAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: account.id } });
      expect(accountAfter.balanceCents).toBe(balanceBefore);

      const transaction = await db.prisma.transaction.findUniqueOrThrow({ where: { id: gift.id } });
      expect(transaction.type).toBe('STOCK_GIFT');
      expect(transaction.balanceBeforeCents).toBe(transaction.balanceAfterCents);

      const holding = await db.prisma.stockHolding.findUniqueOrThrow({
        where: { accountId_symbol: { accountId: account.id, symbol: 'AAPL' } },
      });
      expect(holding.quantity).toBe(3);
      expect(holding.firstPurchaseAt).toBeInstanceOf(Date);
    });

    it('tops up an existing holding instead of duplicating it', async () => {
      const account = await db.prisma.childAccount.findFirstOrThrow({ where: { userId: 'demo-elodie' } });

      await service.giftShares({
        actorId: 'demo-papa',
        actorFamilyId: 'demo-family',
        input: { accountId: account.id, symbol: 'AAPL', companyName: 'Apple Inc', quantity: 2 },
      });

      const holding = await db.prisma.stockHolding.findUniqueOrThrow({
        where: { accountId_symbol: { accountId: account.id, symbol: 'AAPL' } },
      });
      expect(holding.quantity).toBe(5);
    });

    it('refuses to gift into an account from another family', async () => {
      const account = await db.prisma.childAccount.findFirstOrThrow({ where: { userId: 'demo-elodie' } });

      await expect(
        service.giftShares({
          actorId: 'demo-papa',
          actorFamilyId: 'not-demo-family',
          input: { accountId: account.id, symbol: 'AAPL', companyName: 'Apple Inc', quantity: 1 },
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
