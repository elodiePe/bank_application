import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import {
  findBalanceInconsistency,
  importChildAccountHistory,
  parseCsvHistory,
} from './csvImportService.js';

const VALID_CSV = [
  'month_index,period_start,period_end,date,description,withdrawal,deposit,balance,currency',
  '1,01/01/2024,01/31/2024,01/05/2024,Initial Deposit,,100.00,100.00,CHF',
  '1,01/01/2024,01/31/2024,01/10/2024,Allowance,,10.00,110.00,CHF',
  '1,01/01/2024,01/31/2024,01/15/2024,Bonbons,3.50,,106.50,CHF',
  '1,01/01/2024,01/31/2024,01/31/2024,Interest,,2.13,108.63,CHF',
].join('\n');

describe('parseCsvHistory', () => {
  it('parses rows, infers type from column + description, sorts by date', () => {
    const rows = parseCsvHistory(VALID_CSV);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.type)).toEqual(['DEPOSIT', 'DEPOSIT', 'WITHDRAWAL', 'INTEREST']);
    expect(rows[0]?.amountCents).toBe(10000);
    expect(rows[2]?.amountCents).toBe(350);
    expect(rows[2]?.comment).toBe('Bonbons');
  });

  it('rejects a row with both withdrawal and deposit filled', () => {
    const bad = VALID_CSV.replace('3.50,,106.50', '3.50,3.50,106.50');
    expect(() => parseCsvHistory(bad)).toThrow(/Ligne 3/);
  });

  it('strips a UTF-8 BOM before parsing', () => {
    const rows = parseCsvHistory('﻿' + VALID_CSV);
    expect(rows).toHaveLength(4);
  });
});

describe('findBalanceInconsistency', () => {
  it('returns null when the file balance column matches the running total', () => {
    const rows = parseCsvHistory(VALID_CSV);
    expect(findBalanceInconsistency(rows)).toBeNull();
  });

  it('flags a mismatch with the offending line number', () => {
    const corrupted = VALID_CSV.replace('01/31/2024,Interest,,2.13,108.63', '01/31/2024,Interest,,2.13,999.99');
    const rows = parseCsvHistory(corrupted);
    const result = findBalanceInconsistency(rows);
    expect(result).toMatch(/Ligne 4/);
  });
});

describe('importChildAccountHistory (seeded demo family)', () => {
  let db: TestDb;
  let accountId: string;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    const elodie = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'demo-elodie' },
      include: { childAccount: true },
    });
    accountId = elodie.childAccount!.id;
  });

  afterAll(() => db.teardown());

  it('imports every row and computes the final balance', async () => {
    const rows = parseCsvHistory(VALID_CSV);
    const summary = await importChildAccountHistory(db.prisma, {
      accountId,
      sourceFileName: 'elodie.csv',
      rows,
    });

    expect(summary).toMatchObject({
      totalRows: 4,
      imported: 4,
      skippedDuplicates: 0,
      startingBalanceCents: 0,
      finalBalanceCents: 10863,
    });

    const account = await db.prisma.childAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(account.balanceCents).toBe(10863);

    const transactions = await db.prisma.transaction.findMany({
      where: { accountId },
      orderBy: { occurredAt: 'asc' },
    });
    expect(transactions).toHaveLength(4);
    expect(transactions[0]).toMatchObject({ balanceBeforeCents: 0, balanceAfterCents: 10000 });
    expect(transactions[3]).toMatchObject({ balanceBeforeCents: 10650, balanceAfterCents: 10863 });
  });

  it('is idempotent: re-importing the same file creates no duplicates', async () => {
    const rows = parseCsvHistory(VALID_CSV);
    const summary = await importChildAccountHistory(db.prisma, {
      accountId,
      sourceFileName: 'elodie.csv',
      rows,
    });

    expect(summary.imported).toBe(0);
    expect(summary.skippedDuplicates).toBe(4);
    expect(summary.finalBalanceCents).toBe(10863);

    const count = await db.prisma.transaction.count({ where: { accountId } });
    expect(count).toBe(4);
  });

  it('imports only the newly appended rows when the same file grows', async () => {
    const grownCsv =
      VALID_CSV + '\n1,02/01/2024,02/28/2024,02/05/2024,Argent de poche,,5.00,113.63,CHF';
    const rows = parseCsvHistory(grownCsv);

    const summary = await importChildAccountHistory(db.prisma, {
      accountId,
      sourceFileName: 'elodie.csv',
      rows,
    });

    expect(summary.imported).toBe(1);
    expect(summary.skippedDuplicates).toBe(4);
    expect(summary.finalBalanceCents).toBe(11363);
  });

  it('treats a differently-named file as entirely new, even with matching line numbers', async () => {
    const rows = parseCsvHistory(VALID_CSV);
    const summary = await importChildAccountHistory(db.prisma, {
      accountId,
      sourceFileName: 'elodie-correction.csv',
      rows,
    });

    expect(summary.imported).toBe(4);
    expect(summary.skippedDuplicates).toBe(0);
    // Continues accumulating on top of the current balance rather than resetting.
    expect(summary.startingBalanceCents).toBe(11363);
  });
});
