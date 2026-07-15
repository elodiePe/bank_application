import type { PrismaClient } from '@prisma/client';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createAllowanceHistoryRepository } from '../repositories/allowanceHistoryRepository.js';
import { ForbiddenError } from '../utils/errors.js';
import { addWeeks, getMondayOfWeek } from '../utils/dateWeek.js';

/** Safety cap on how many missed weeks a single account can catch up on in one pass. */
const MAX_CATCH_UP_WEEKS = 104;

export interface AllowancePayment {
  accountId: string;
  childFirstName: string;
  weekStart: Date;
  amountCents: number;
}

export function createAllowanceService(prisma: PrismaClient) {
  return {
    async setWeeklyAllowance(params: {
      accountId: string;
      familyId: string;
      amountCents: number;
    }): Promise<void> {
      const accountRepo = createChildAccountRepository(prisma);
      const account = await accountRepo.findByIdOrThrow(params.accountId);
      if (account.user.familyId !== params.familyId) {
        throw new ForbiddenError("Ce compte n'appartient pas à votre famille");
      }

      const wasEnabled = account.weeklyAllowanceCents > 0;
      const nowEnabled = params.amountCents > 0;

      let enabledSince = account.allowanceEnabledSince;
      if (nowEnabled && !wasEnabled) {
        enabledSince = new Date();
      } else if (!nowEnabled) {
        enabledSince = null;
      }

      await accountRepo.updateWeeklyAllowance(params.accountId, params.amountCents, enabledSince);
    },

    /**
     * Idempotent: pays every Monday from when the allowance was enabled up to and including
     * the current week, for every account across every family, skipping weeks already
     * recorded in AllowanceHistory. Safe to call repeatedly (e.g. on every server start) —
     * a week is never paid twice.
     */
    async processWeeklyAllowances(now = new Date()): Promise<AllowancePayment[]> {
      const accountRepo = createChildAccountRepository(prisma);
      const allowanceHistoryRepo = createAllowanceHistoryRepository(prisma);

      const currentWeekStart = getMondayOfWeek(now);
      const accounts = await accountRepo.listWithAllowanceEnabled();
      const payments: AllowancePayment[] = [];

      for (const account of accounts) {
        if (!account.allowanceEnabledSince) continue;

        const paidWeeks = await allowanceHistoryRepo.listWeekStartsForAccount(account.id);
        let week = getMondayOfWeek(account.allowanceEnabledSince);
        let iterations = 0;

        while (week.getTime() <= currentWeekStart.getTime() && iterations < MAX_CATCH_UP_WEEKS) {
          iterations += 1;
          if (!paidWeeks.has(week.getTime())) {
            await prisma.$transaction(async (tx) => {
              const txAccountRepo = createChildAccountRepository(tx);
              const txTransactionRepo = createTransactionRepository(tx);
              const txAllowanceHistoryRepo = createAllowanceHistoryRepository(tx);

              const current = await txAccountRepo.findByIdOrThrow(account.id);
              const balanceAfter = current.balanceCents + account.weeklyAllowanceCents;

              const transaction = await txTransactionRepo.create({
                account: { connect: { id: account.id } },
                type: 'DEPOSIT',
                status: 'COMPLETED',
                amountCents: account.weeklyAllowanceCents,
                balanceBeforeCents: current.balanceCents,
                balanceAfterCents: balanceAfter,
                comment: 'Argent de poche hebdomadaire',
                occurredAt: week,
              });
              await txAccountRepo.updateBalance(account.id, balanceAfter);
              await txAllowanceHistoryRepo.create({
                accountId: account.id,
                weekStart: week,
                amountCents: account.weeklyAllowanceCents,
                transactionId: transaction.id,
              });
            });

            payments.push({
              accountId: account.id,
              childFirstName: account.user.firstName,
              weekStart: week,
              amountCents: account.weeklyAllowanceCents,
            });
          }
          week = addWeeks(week, 1);
        }
      }

      return payments;
    },
  };
}

export type AllowanceService = ReturnType<typeof createAllowanceService>;
