import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import type { PrismaClient, TransactionType } from '@prisma/client';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';

/**
 * Expected CSV export format (MyKidsBank-style history export):
 * month_index,period_start,period_end,date,description,withdrawal,deposit,balance,currency
 *
 * Only `date`, `description`, `withdrawal`, `deposit` and `balance` are used. `date` is
 * MM/DD/YYYY. Exactly one of `withdrawal`/`deposit` must be filled per row (may be "0.00").
 * `balance` is the source's own running balance, used purely as a consistency check —
 * our own balanceBefore/balanceAfter on each Transaction are always computed independently.
 */
const rawRowSchema = z.object({
  date: z.string().min(1),
  description: z.string().optional().default(''),
  withdrawal: z.string().optional().default(''),
  deposit: z.string().optional().default(''),
  balance: z.string().min(1),
});

export interface ParsedCsvRow {
  /** 1-based line number in the source file (header excluded), used for stable dedup. */
  sourceLine: number;
  date: Date;
  type: TransactionType;
  amountCents: number;
  comment: string | null;
  providedBalanceCents: number;
}

function parseAmountToCents(raw: string): number {
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Montant invalide : "${raw}"`);
  }
  return Math.round(value * 100);
}

function parseUsDate(raw: string): Date {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Date invalide (attendu MM/DD/YYYY) : "${raw}"`);
  }
  const [, month, day, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/** Parses raw CSV text into validated rows. Throws with all row-level errors if any are found. */
export function parseCsvHistory(content: string): ParsedCsvRow[] {
  const withoutBom = content.replace(/^﻿/, '');
  const records: unknown[] = parse(withoutBom, { columns: true, skip_empty_lines: true, trim: true });

  const rows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  records.forEach((record, index) => {
    const sourceLine = index + 1;
    const parsed = rawRowSchema.safeParse(record);
    if (!parsed.success) {
      errors.push(`Ligne ${sourceLine}: colonnes manquantes ou invalides`);
      return;
    }
    const { date, description, withdrawal, deposit, balance } = parsed.data;

    try {
      const hasWithdrawal = withdrawal.trim() !== '';
      const hasDeposit = deposit.trim() !== '';
      if (hasWithdrawal === hasDeposit) {
        throw new Error('exactement une des colonnes withdrawal/deposit doit être renseignée');
      }

      const amountCents = parseAmountToCents(hasWithdrawal ? withdrawal : deposit);
      const isInterest = /interest|int[ée]r[êe]ts?/i.test(description);
      const type: TransactionType = hasWithdrawal ? 'WITHDRAWAL' : isInterest ? 'INTEREST' : 'DEPOSIT';

      rows.push({
        sourceLine,
        date: parseUsDate(date),
        type,
        amountCents,
        comment: description.trim() === '' ? null : description.trim(),
        providedBalanceCents: parseAmountToCents(balance),
      });
    } catch (err) {
      errors.push(`Ligne ${sourceLine}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Fichier CSV invalide (${errors.length} erreur(s)) :\n${errors.join('\n')}`);
  }

  return rows.sort((a, b) => a.date.getTime() - b.date.getTime() || a.sourceLine - b.sourceLine);
}

/**
 * Cross-checks the file's own cumulative balance against a fresh from-zero simulation of
 * its rows, so a parsing mistake (wrong sign, wrong column) is caught before anything is
 * written to the database. Returns a description of the first mismatch, or null if consistent.
 */
export function findBalanceInconsistency(rows: ParsedCsvRow[]): string | null {
  let running = 0;
  for (const row of rows) {
    running += row.type === 'WITHDRAWAL' ? -row.amountCents : row.amountCents;
    if (running !== row.providedBalanceCents) {
      return (
        `Ligne ${row.sourceLine} (${row.date.toISOString().slice(0, 10)}): solde calculé ` +
        `${(running / 100).toFixed(2)} ≠ solde du fichier ${(row.providedBalanceCents / 100).toFixed(2)}`
      );
    }
  }
  return null;
}

function computeExternalRef(accountId: string, sourceFileName: string, sourceLine: number): string {
  return createHash('sha256').update(`${accountId}:${sourceFileName}:${sourceLine}`).digest('hex');
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  skippedDuplicates: number;
  startingBalanceCents: number;
  finalBalanceCents: number;
}

export async function importChildAccountHistory(
  prisma: PrismaClient,
  params: { accountId: string; sourceFileName: string; rows: ParsedCsvRow[] },
): Promise<ImportSummary> {
  const transactionRepository = createTransactionRepository(prisma);
  const childAccountRepository = createChildAccountRepository(prisma);

  const account = await childAccountRepository.findByIdOrThrow(params.accountId);
  const existingRefs = new Set(await transactionRepository.listExternalRefs(params.accountId));

  let running = account.balanceCents;
  const startingBalanceCents = running;
  let skipped = 0;
  const toCreate: Parameters<typeof transactionRepository.createMany>[0] = [];

  for (const row of params.rows) {
    const externalRef = computeExternalRef(params.accountId, params.sourceFileName, row.sourceLine);
    if (existingRefs.has(externalRef)) {
      skipped += 1;
      continue;
    }

    const signedCents = row.type === 'WITHDRAWAL' ? -row.amountCents : row.amountCents;
    const balanceBeforeCents = running;
    running += signedCents;

    toCreate.push({
      accountId: params.accountId,
      type: row.type,
      status: 'COMPLETED',
      amountCents: row.amountCents,
      balanceBeforeCents,
      balanceAfterCents: running,
      comment: row.comment,
      occurredAt: row.date,
      externalRef,
    });
  }

  await prisma.$transaction([
    transactionRepository.createMany(toCreate),
    childAccountRepository.updateBalance(params.accountId, running),
  ]);

  return {
    totalRows: params.rows.length,
    imported: toCreate.length,
    skippedDuplicates: skipped,
    startingBalanceCents,
    finalBalanceCents: running,
  };
}
