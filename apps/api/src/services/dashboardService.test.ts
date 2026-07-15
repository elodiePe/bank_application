import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { createMoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createDashboardService, type DashboardService } from './dashboardService.js';

describe('dashboardService (seeded demo family)', () => {
  let db: TestDb;
  let dashboardService: DashboardService;
  let elodieAccountId: string;
  let matthieuAccountId: string;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);

    dashboardService = createDashboardService({
      familyRepository: createFamilyRepository(db.prisma),
      moneyRequestRepository: createMoneyRequestRepository(db.prisma),
      transactionRepository: createTransactionRepository(db.prisma),
      childAccountRepository: createChildAccountRepository(db.prisma),
      userRepository: createUserRepository(db.prisma),
    });

    const elodie = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-elodie' },
      include: { childAccount: true },
    });
    const matthieu = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-matthieu' },
      include: { childAccount: true },
    });
    elodieAccountId = elodie.childAccount!.id;
    matthieuAccountId = matthieu.childAccount!.id;

    await db.prisma.childAccount.update({
      where: { id: elodieAccountId },
      data: { balanceCents: 5000 },
    });
    await db.prisma.childAccount.update({
      where: { id: matthieuAccountId },
      data: { balanceCents: 3000 },
    });

    await db.prisma.transaction.create({
      data: {
        accountId: elodieAccountId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amountCents: 5000,
        balanceBeforeCents: 0,
        balanceAfterCents: 5000,
        comment: 'Argent de poche',
        occurredAt: new Date('2024-01-01T00:00:00Z'),
      },
    });
    await db.prisma.transaction.create({
      data: {
        accountId: matthieuAccountId,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amountCents: 3000,
        balanceBeforeCents: 0,
        balanceAfterCents: 3000,
        comment: 'Anniversaire',
        occurredAt: new Date('2024-02-01T00:00:00Z'),
      },
    });

    await db.prisma.moneyRequest.create({
      data: {
        requesterId: 'demo-elodie',
        type: 'WITHDRAWAL_REQUEST',
        status: 'PENDING',
        amountCents: 1000,
      },
    });

    // Extra fixtures for the search/filter/sort/pagination tests below.
    await db.prisma.transaction.create({
      data: {
        accountId: elodieAccountId,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        amountCents: 1500,
        balanceBeforeCents: 5000,
        balanceAfterCents: 3500,
        comment: 'Chaussures de foot',
        occurredAt: new Date('2024-03-01T00:00:00Z'),
      },
    });
    await db.prisma.transaction.create({
      data: {
        accountId: elodieAccountId,
        type: 'INTEREST',
        status: 'COMPLETED',
        amountCents: 84,
        balanceBeforeCents: 3500,
        balanceAfterCents: 3584,
        comment: 'Intérêts mensuels',
        occurredAt: new Date('2024-04-01T00:00:00Z'),
      },
    });
  });

  afterAll(() => db.teardown());

  it('sums balances across all children for the total', async () => {
    const overview = await dashboardService.getParentOverview('demo-family');
    // Elodie 5000 + Matthieu 3000 + Damien 0 (untouched)
    expect(overview.totalBalanceCents).toBe(8000);
    expect(overview.children).toHaveLength(3);
  });

  it('includes each child with their own balance', async () => {
    const overview = await dashboardService.getParentOverview('demo-family');
    const elodie = overview.children.find((c) => c.firstName === 'Elodie');
    expect(elodie?.balanceCents).toBe(5000);
  });

  it('counts only pending money requests', async () => {
    const overview = await dashboardService.getParentOverview('demo-family');
    expect(overview.pendingRequestsCount).toBe(1);
  });

  it('lists recent transactions across the family, most recent first', async () => {
    const recent = await dashboardService.getRecentFamilyTransactions('demo-family');
    expect(recent).toHaveLength(4);
    expect(recent[0]).toMatchObject({ childFirstName: 'Elodie', comment: 'Intérêts mensuels' });
    expect(recent[recent.length - 1]).toMatchObject({ childFirstName: 'Elodie', comment: 'Argent de poche' });
  });

  it('respects the limit parameter', async () => {
    const recent = await dashboardService.getRecentFamilyTransactions('demo-family', 1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.comment).toBe('Intérêts mensuels');
  });

  it("returns a child's own overview with siblings but not themselves", async () => {
    const overview = await dashboardService.getChildOverview('demo-elodie', 'demo-family');
    expect(overview.balanceCents).toBe(5000);
    expect(overview.siblings.map((s) => s.firstName).sort()).toEqual(['Damien', 'Matthieu']);
  });

  it("returns only the child's own transactions, not their siblings'", async () => {
    const transactions = await dashboardService.getMyTransactions('demo-elodie');
    expect(transactions).toHaveLength(3);
    expect(transactions.every((t) => t.childFirstName === 'Elodie')).toBe(true);
    expect(transactions[0]).toMatchObject({ comment: 'Intérêts mensuels' });
  });

  describe('searchFamilyTransactions', () => {
    it('finds a transaction by comment text', async () => {
      const result = await dashboardService.searchFamilyTransactions('demo-family', { search: 'chaussures' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.comment).toBe('Chaussures de foot');
    });

    it('filters by transaction type', async () => {
      const result = await dashboardService.searchFamilyTransactions('demo-family', { type: 'INTEREST' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.type).toBe('INTEREST');
    });

    it('filters by date range', async () => {
      const result = await dashboardService.searchFamilyTransactions('demo-family', {
        dateFrom: '2024-02-15T00:00:00Z',
        dateTo: '2024-03-15T00:00:00Z',
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.comment).toBe('Chaussures de foot');
    });

    it('scopes to a single child when childUserId is provided', async () => {
      const result = await dashboardService.searchFamilyTransactions('demo-family', { childUserId: 'demo-matthieu' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.childFirstName).toBe('Matthieu');
    });

    it('sorts by amount ascending', async () => {
      const result = await dashboardService.searchFamilyTransactions('demo-family', {
        childUserId: 'demo-elodie',
        sortBy: 'amountCents',
        sortDir: 'asc',
      });
      expect(result.items.map((t) => t.amountCents)).toEqual([84, 1500, 5000]);
    });

    it('paginates results and reports the correct total', async () => {
      const page1 = await dashboardService.searchFamilyTransactions('demo-family', { pageSize: 2, page: 1 });
      const page2 = await dashboardService.searchFamilyTransactions('demo-family', { pageSize: 2, page: 2 });

      expect(page1.total).toBe(4);
      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(2);
      const allIds = [...page1.items, ...page2.items].map((t) => t.id);
      expect(new Set(allIds).size).toBe(4); // no overlap between pages
    });
  });

  describe('searchMyTransactions', () => {
    it("never returns a sibling's transactions, even if childUserId is spoofed in the query", async () => {
      const result = await dashboardService.searchMyTransactions('demo-elodie', 'demo-family', {
        childUserId: 'demo-matthieu',
      });
      expect(result.items.every((t) => t.childFirstName === 'Elodie')).toBe(true);
      expect(result.items.some((t) => t.comment === 'Anniversaire')).toBe(false);
    });
  });
});
