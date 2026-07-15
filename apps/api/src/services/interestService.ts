import type { PrismaClient } from '@prisma/client';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createInterestHistoryRepository } from '../repositories/interestHistoryRepository.js';
import { createSettingsRepository } from '../repositories/settingsRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createNotificationService } from './notificationService.js';
import { addMonths, getMonthStart } from '../utils/dateMonth.js';

/** Safety cap on how many missed months a single account can catch up on in one pass. */
const MAX_CATCH_UP_MONTHS = 60;

export interface InterestPayment {
  accountId: string;
  childFirstName: string;
  month: Date;
  amountCents: number;
}

export function createInterestService(prisma: PrismaClient) {
  return {
    /**
     * Idempotent: credits interest for every child account, once per calendar month, never
     * twice (InterestHistory has a unique accountId+month constraint). `defaultInterestRateBps`
     * is an ANNUAL rate (240 = 2.40% per year) — each monthly credit is 1/12th of it, applied
     * to the balance at month end. A month is only credited once it has fully elapsed (paid
     * "at the end of the month", never for the current, still-open month).
     *
     * The first eligible month for a given account is set (once, lazily) the first time this
     * ever runs for it — `ChildAccount.interestEligibleSince` — and never earlier. It
     * deliberately does not backfill from account creation, because accounts imported from a
     * CSV history (see étape 3) already contain their own historical "Intérêt" transactions
     * computed by the source bank export; backfilling here would double-credit those months.
     * Subsequent runs do catch up any closed months missed while the server was off, same as
     * the weekly allowance processor.
     */
    async processMonthlyInterest(now = new Date()): Promise<InterestPayment[]> {
      const accountRepo = createChildAccountRepository(prisma);
      const interestHistoryRepo = createInterestHistoryRepository(prisma);
      const settingsRepo = createSettingsRepository(prisma);
      const notificationService = createNotificationService(prisma);

      const currentMonthStart = getMonthStart(now);
      const accounts = await accountRepo.listAll();
      const payments: InterestPayment[] = [];
      const rateCache = new Map<string, number>();

      for (const account of accounts) {
        const familyId = account.user.familyId;
        let rateBps = rateCache.get(familyId);
        if (rateBps === undefined) {
          const settings = await settingsRepo.findByFamilyIdOrThrow(familyId);
          rateBps = settings.defaultInterestRateBps;
          rateCache.set(familyId, rateBps);
        }
        if (rateBps <= 0) continue;

        let eligibleSince = account.interestEligibleSince;
        if (!eligibleSince) {
          eligibleSince = currentMonthStart;
          await accountRepo.setInterestEligibleSince(account.id, eligibleSince);
        }

        const latest = await interestHistoryRepo.findLatestForAccount(account.id);
        const paidMonths = await interestHistoryRepo.listMonthsForAccount(account.id);
        let month = latest ? addMonths(latest.month, 1) : getMonthStart(eligibleSince);
        let iterations = 0;

        // Strictly-less-than: a month must have fully ended before it's credited.
        while (month.getTime() < currentMonthStart.getTime() && iterations < MAX_CATCH_UP_MONTHS) {
          iterations += 1;
          if (!paidMonths.has(month.getTime())) {
            const monthForTx = month;
            const rate = rateBps;

            const result = await prisma.$transaction(async (tx) => {
              const txAccountRepo = createChildAccountRepository(tx);
              const txTransactionRepo = createTransactionRepository(tx);
              const txInterestHistoryRepo = createInterestHistoryRepository(tx);

              const current = await txAccountRepo.findByIdOrThrow(account.id);
              // rate is an ANNUAL basis-point rate — divide by 12 for the monthly credit.
              const amountCents = Math.round((current.balanceCents * rate) / 10_000 / 12);
              // Skip empty accounts — no point crediting 0 CHF and cluttering the ledger.
              if (amountCents === 0) return null;

              const balanceAfter = current.balanceCents + amountCents;

              const transaction = await txTransactionRepo.create({
                account: { connect: { id: account.id } },
                type: 'INTEREST',
                status: 'COMPLETED',
                amountCents,
                balanceBeforeCents: current.balanceCents,
                balanceAfterCents: balanceAfter,
                comment: 'Intérêts mensuels',
                occurredAt: monthForTx,
              });
              await txAccountRepo.updateBalance(account.id, balanceAfter);
              await txInterestHistoryRepo.create({
                accountId: account.id,
                month: monthForTx,
                rateBps: rate,
                amountCents,
                transactionId: transaction.id,
              });

              return { id: transaction.id, amountCents };
            });

            if (result) {
              payments.push({
                accountId: account.id,
                childFirstName: account.user.firstName,
                month: monthForTx,
                amountCents: result.amountCents,
              });
              await notificationService.notifyInterest({
                userId: account.userId,
                amountCents: result.amountCents,
                transactionId: result.id,
              });
            }
          }
          month = addMonths(month, 1);
        }
      }

      return payments;
    },
  };
}

export type InterestService = ReturnType<typeof createInterestService>;
