import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createInterestService, type InterestService } from './interestService.js';
import { addMonths, getMonthStart } from '../utils/dateMonth.js';

describe('interestService (seeded demo family)', () => {
  let db: TestDb;
  let interestService: InterestService;
  let elodieAccountId: string;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    interestService = createInterestService(db.prisma);

    const elodie = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-elodie' },
      include: { childAccount: true },
    });
    elodieAccountId = elodie.childAccount!.id;

    // Give Elodie a starting balance — interest history import (étape 3) already covers
    // her real historical months, so this simulates "some balance exists" at first run.
    await db.prisma.childAccount.update({
      where: { id: elodieAccountId },
      data: { balanceCents: 10_000 }, // 100.00 CHF
    });
  });

  afterAll(() => db.teardown());

  const firstRunDate = new Date('2024-03-15T00:00:00Z');

  it('pays nothing on the very first run — the current, still-open month is never credited', async () => {
    const payments = await interestService.processMonthlyInterest(firstRunDate);

    const elodiePayments = payments.filter((p) => p.accountId === elodieAccountId);
    expect(elodiePayments).toHaveLength(0);

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(account.balanceCents).toBe(10_000); // unchanged
    expect(account.interestEligibleSince?.getTime()).toBe(getMonthStart(firstRunDate).getTime());

    const history = await db.prisma.interestHistory.findMany({ where: { accountId: elodieAccountId } });
    expect(history).toHaveLength(0);
  });

  it('credits March once April starts — 1/12th of the ANNUAL rate, paid at month end', async () => {
    const startOfApril = addMonths(firstRunDate, 1); // April 1st
    const payments = await interestService.processMonthlyInterest(startOfApril);

    const elodiePayments = payments.filter((p) => p.accountId === elodieAccountId);
    expect(elodiePayments).toHaveLength(1);
    expect(elodiePayments[0]?.month.getTime()).toBe(getMonthStart(firstRunDate).getTime()); // March

    // Annual rate 2.40% / 12 months = 0.20%/month. 0.20% of 10 000 cents = 20 cents.
    expect(elodiePayments[0]?.amountCents).toBe(20);

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(account.balanceCents).toBe(10_020);

    const history = await db.prisma.interestHistory.findMany({ where: { accountId: elodieAccountId } });
    expect(history).toHaveLength(1);
  });

  it('is idempotent: processing the same closed month again pays nothing more', async () => {
    const startOfApril = addMonths(firstRunDate, 1);
    const payments = await interestService.processMonthlyInterest(startOfApril);
    const elodiePayments = payments.filter((p) => p.accountId === elodieAccountId);
    expect(elodiePayments).toHaveLength(0);

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(account.balanceCents).toBe(10_020); // unchanged
  });

  it('catches up missed closed months, compounding on the updated balance each month', async () => {
    const startOfJuly = addMonths(firstRunDate, 4); // July 1st — closes April, May, June
    const payments = await interestService.processMonthlyInterest(startOfJuly);
    const elodiePayments = payments.filter((p) => p.accountId === elodieAccountId);

    expect(elodiePayments).toHaveLength(3); // April, May, June

    // Compounding: 1/12th of 2.40% = 20 bps/month, rounded each step.
    let expectedBalance = 10_020;
    for (let i = 0; i < 3; i++) {
      expectedBalance += Math.round((expectedBalance * 240) / 10_000 / 12);
    }
    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(account.balanceCents).toBe(expectedBalance);

    const history = await db.prisma.interestHistory.findMany({ where: { accountId: elodieAccountId } });
    expect(history).toHaveLength(4); // March + April + May + June
  });

  it('applies a rate change only to months processed after the change, not retroactively', async () => {
    await db.prisma.settings.update({
      where: { familyId: 'demo-family' },
      data: { defaultInterestRateBps: 1200 }, // 12% annual, for a clearly distinct amount
    });

    const startOfAugust = addMonths(firstRunDate, 5); // closes July
    await interestService.processMonthlyInterest(startOfAugust);

    const history = await db.prisma.interestHistory.findMany({
      where: { accountId: elodieAccountId },
      orderBy: { month: 'asc' },
    });
    expect(history[0]?.rateBps).toBe(240); // March, recorded at the old annual rate
    expect(history[history.length - 1]?.rateBps).toBe(1200); // July, recorded at the new annual rate
  });

  it('sends an INTEREST_APPLIED notification for each credited month', async () => {
    const notifs = await db.prisma.notification.findMany({
      where: { userId: 'demo-elodie', type: 'INTEREST_APPLIED' },
    });
    // One per credited month for Elodie so far (March, April, May, June, July).
    expect(notifs.length).toBeGreaterThanOrEqual(5);
  });

  it('skips accounts entirely when the family interest rate is 0', async () => {
    await db.prisma.settings.update({
      where: { familyId: 'demo-family' },
      data: { defaultInterestRateBps: 0 },
    });

    const matthieu = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-matthieu' },
      include: { childAccount: true },
    });
    const matthieuAccountId = matthieu.childAccount!.id;
    await db.prisma.childAccount.update({
      where: { id: matthieuAccountId },
      data: { balanceCents: 5_000 },
    });

    const farFuture = addMonths(firstRunDate, 13);
    const payments = await interestService.processMonthlyInterest(farFuture);
    expect(payments.some((p) => p.accountId === matthieuAccountId)).toBe(false);

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });
    expect(account.balanceCents).toBe(5_000); // unchanged

    const history = await db.prisma.interestHistory.findMany({ where: { accountId: matthieuAccountId } });
    expect(history).toHaveLength(0);
  });
});
