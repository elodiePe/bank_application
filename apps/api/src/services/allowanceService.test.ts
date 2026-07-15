import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createAllowanceService, type AllowanceService } from './allowanceService.js';
import { ForbiddenError } from '../utils/errors.js';
import { addWeeks, getMondayOfWeek } from '../utils/dateWeek.js';

describe('allowanceService (seeded demo family)', () => {
  let db: TestDb;
  let allowanceService: AllowanceService;
  let elodieAccountId: string;
  let matthieuAccountId: string;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    allowanceService = createAllowanceService(db.prisma);

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
  });

  afterAll(() => db.teardown());

  it('rejects configuring an account outside the caller family', async () => {
    await expect(
      allowanceService.setWeeklyAllowance({
        accountId: elodieAccountId,
        familyId: 'some-other-family',
        amountCents: 1000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('pays a different amount per child, only once for the week it was enabled', async () => {
    await allowanceService.setWeeklyAllowance({
      accountId: elodieAccountId,
      familyId: 'demo-family',
      amountCents: 1000, // 10.00 CHF/week
    });
    await allowanceService.setWeeklyAllowance({
      accountId: matthieuAccountId,
      familyId: 'demo-family',
      amountCents: 500, // 5.00 CHF/week
    });

    const enabledAt = (await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } }))
      .allowanceEnabledSince!;

    const payments = await allowanceService.processWeeklyAllowances(enabledAt);
    expect(payments).toHaveLength(2);

    const elodie = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    const matthieu = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });
    expect(elodie.balanceCents).toBe(1000);
    expect(matthieu.balanceCents).toBe(500);

    const history = await db.prisma.allowanceHistory.findMany({ where: { accountId: elodieAccountId } });
    expect(history).toHaveLength(1);
    expect(history[0]?.weekStart.getTime()).toBe(getMondayOfWeek(enabledAt).getTime());
  });

  it('is idempotent: processing again for the same week pays nothing more', async () => {
    const enabledAt = (await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } }))
      .allowanceEnabledSince!;

    const payments = await allowanceService.processWeeklyAllowances(enabledAt);
    expect(payments).toHaveLength(0);

    const elodie = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(elodie.balanceCents).toBe(1000); // unchanged
  });

  it('catches up several missed weeks at once when processed late', async () => {
    const enabledAt = (await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } }))
      .allowanceEnabledSince!;

    const threeWeeksLater = addWeeks(enabledAt, 3);
    const payments = await allowanceService.processWeeklyAllowances(threeWeeksLater);

    // 3 more weeks for each of the 2 children (the first week was already paid above).
    expect(payments).toHaveLength(6);

    const elodie = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    const matthieu = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });
    expect(elodie.balanceCents).toBe(1000 * 4); // 1 initial + 3 caught-up weeks
    expect(matthieu.balanceCents).toBe(500 * 4);
  });

  it('stops paying once disabled (amount set to 0)', async () => {
    await allowanceService.setWeeklyAllowance({
      accountId: matthieuAccountId,
      familyId: 'demo-family',
      amountCents: 0,
    });

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });
    expect(account.weeklyAllowanceCents).toBe(0);
    expect(account.allowanceEnabledSince).toBeNull();

    const balanceBefore = account.balanceCents;
    const farFuture = addWeeks(new Date(), 10);
    await allowanceService.processWeeklyAllowances(farFuture);

    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });
    expect(after.balanceCents).toBe(balanceBefore); // no more allowance payments
  });
});
