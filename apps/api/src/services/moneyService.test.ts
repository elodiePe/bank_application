import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createMoneyService, type MoneyService } from './moneyService.js';
import { AlreadyReversedError, ForbiddenError, InsufficientFundsError } from '../utils/errors.js';

describe('moneyService (seeded demo family)', () => {
  let db: TestDb;
  let moneyService: MoneyService;
  let elodieAccountId: string;
  let matthieuAccountId: string;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    moneyService = createMoneyService(db.prisma);

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

  it('deposit increases the balance and records the transaction', async () => {
    const tx = await moneyService.deposit({
      accountId: elodieAccountId,
      familyId: 'demo-family',
      amountCents: 5000,
      comment: 'Argent de poche',
      validatedById: 'demo-papa',
    });

    expect(tx).toMatchObject({ type: 'DEPOSIT', balanceBeforeCents: 0, balanceAfterCents: 5000 });
    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(account.balanceCents).toBe(5000);
  });

  it('withdrawal decreases the balance when funds are sufficient', async () => {
    const tx = await moneyService.withdrawal({
      accountId: elodieAccountId,
      familyId: 'demo-family',
      amountCents: 2000,
      validatedById: 'demo-papa',
    });

    expect(tx).toMatchObject({ type: 'WITHDRAWAL', balanceBeforeCents: 5000, balanceAfterCents: 3000 });
  });

  it('rejects a withdrawal larger than the current balance', async () => {
    await expect(
      moneyService.withdrawal({
        accountId: elodieAccountId,
        familyId: 'demo-family',
        amountCents: 1_000_000,
        validatedById: 'demo-papa',
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(account.balanceCents).toBe(3000); // unchanged
  });

  it('rejects an operation on an account outside the caller family', async () => {
    await expect(
      moneyService.deposit({
        accountId: elodieAccountId,
        familyId: 'some-other-family',
        amountCents: 100,
        validatedById: 'demo-papa',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('transfer moves money atomically between two children', async () => {
    await moneyService.deposit({
      accountId: matthieuAccountId,
      familyId: 'demo-family',
      amountCents: 1000,
      validatedById: 'demo-papa',
    });

    const [debit, credit] = await moneyService.transfer({
      fromAccountId: elodieAccountId,
      toAccountId: matthieuAccountId,
      familyId: 'demo-family',
      amountCents: 1500,
      comment: 'Prêt',
      validatedById: 'demo-papa',
    });

    expect(debit).toMatchObject({ accountId: elodieAccountId, balanceBeforeCents: 3000, balanceAfterCents: 1500 });
    expect(credit).toMatchObject({ accountId: matthieuAccountId, balanceBeforeCents: 1000, balanceAfterCents: 2500 });
    expect(debit?.transferGroupId).toBe(credit?.transferGroupId);
  });

  it('rejects a transfer when the sender lacks the funds, leaving both accounts untouched', async () => {
    const before = await db.prisma.childAccount.findMany({
      where: { id: { in: [elodieAccountId, matthieuAccountId] } },
    });

    await expect(
      moneyService.transfer({
        fromAccountId: elodieAccountId,
        toAccountId: matthieuAccountId,
        familyId: 'demo-family',
        amountCents: 999_999,
        validatedById: 'demo-papa',
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    const after = await db.prisma.childAccount.findMany({
      where: { id: { in: [elodieAccountId, matthieuAccountId] } },
    });
    expect(after).toEqual(before);
  });

  it('correction reverses a simple deposit and restores the balance', async () => {
    const deposit = await moneyService.deposit({
      accountId: elodieAccountId,
      familyId: 'demo-family',
      amountCents: 777,
      validatedById: 'demo-papa',
    });
    const before = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });

    const [correction] = await moneyService.correctTransaction({
      transactionId: deposit.id,
      familyId: 'demo-family',
      validatedById: 'demo-papa',
    });

    expect(correction).toMatchObject({ type: 'CORRECTION', reversalOfId: deposit.id, amountCents: 777 });
    const after = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    expect(after.balanceCents).toBe(before.balanceCents - 777);
  });

  it('correction reverses both legs of a transfer', async () => {
    const [debit, credit] = await moneyService.transfer({
      fromAccountId: elodieAccountId,
      toAccountId: matthieuAccountId,
      familyId: 'demo-family',
      amountCents: 200,
      validatedById: 'demo-papa',
    });
    const elodieBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    const matthieuBefore = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });

    const corrections = await moneyService.correctTransaction({
      transactionId: debit!.id,
      familyId: 'demo-family',
      validatedById: 'demo-papa',
    });

    expect(corrections).toHaveLength(2);
    expect(corrections.map((c) => c.reversalOfId).sort()).toEqual([debit!.id, credit!.id].sort());

    const elodieAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: elodieAccountId } });
    const matthieuAfter = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: matthieuAccountId } });
    expect(elodieAfter.balanceCents).toBe(elodieBefore.balanceCents + 200);
    expect(matthieuAfter.balanceCents).toBe(matthieuBefore.balanceCents - 200);
  });

  it('refuses to correct the same transaction twice', async () => {
    const deposit = await moneyService.deposit({
      accountId: matthieuAccountId,
      familyId: 'demo-family',
      amountCents: 50,
      validatedById: 'demo-papa',
    });
    await moneyService.correctTransaction({
      transactionId: deposit.id,
      familyId: 'demo-family',
      validatedById: 'demo-papa',
    });

    await expect(
      moneyService.correctTransaction({
        transactionId: deposit.id,
        familyId: 'demo-family',
        validatedById: 'demo-papa',
      }),
    ).rejects.toBeInstanceOf(AlreadyReversedError);
  });
});
