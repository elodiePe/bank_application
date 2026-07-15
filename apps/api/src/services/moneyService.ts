import { randomUUID } from 'node:crypto';
import type { PrismaClient, Transaction } from '@prisma/client';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { AlreadyReversedError, ForbiddenError, InsufficientFundsError } from '../utils/errors.js';

interface ActorContext {
  familyId: string;
  validatedById: string;
}

async function assertOwnedByFamily(
  accountRepo: ReturnType<typeof createChildAccountRepository>,
  accountId: string,
  familyId: string,
) {
  const account = await accountRepo.findByIdOrThrow(accountId);
  if (account.user.familyId !== familyId) {
    throw new ForbiddenError("Ce compte n'appartient pas à votre famille");
  }
  return account;
}

// Only for account-affecting operations (deposit/withdrawal/transfer) — deliberately not
// applied to correctTransaction, since correcting a past mistake must stay possible even
// after the account has been deactivated.
function assertAccountActive(account: { user: { deactivatedAt: Date | null } }) {
  if (account.user.deactivatedAt !== null) {
    throw new ForbiddenError('Ce compte enfant est désactivé.');
  }
}

export function createMoneyService(prisma: PrismaClient) {
  return {
    deposit(params: { accountId: string; amountCents: number; comment?: string } & ActorContext) {
      return prisma.$transaction(async (tx) => {
        const accountRepo = createChildAccountRepository(tx);
        const transactionRepo = createTransactionRepository(tx);

        const account = await assertOwnedByFamily(accountRepo, params.accountId, params.familyId);
        assertAccountActive(account);
        const balanceAfter = account.balanceCents + params.amountCents;

        const transaction = await transactionRepo.create({
          account: { connect: { id: params.accountId } },
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amountCents: params.amountCents,
          balanceBeforeCents: account.balanceCents,
          balanceAfterCents: balanceAfter,
          comment: params.comment ?? null,
          validatedBy: { connect: { id: params.validatedById } },
          occurredAt: new Date(),
        });
        await accountRepo.updateBalance(params.accountId, balanceAfter);
        return transaction;
      });
    },

    withdrawal(params: { accountId: string; amountCents: number; comment?: string } & ActorContext) {
      return prisma.$transaction(async (tx) => {
        const accountRepo = createChildAccountRepository(tx);
        const transactionRepo = createTransactionRepository(tx);

        const account = await assertOwnedByFamily(accountRepo, params.accountId, params.familyId);
        assertAccountActive(account);
        if (params.amountCents > account.balanceCents) {
          throw new InsufficientFundsError();
        }
        const balanceAfter = account.balanceCents - params.amountCents;

        const transaction = await transactionRepo.create({
          account: { connect: { id: params.accountId } },
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amountCents: params.amountCents,
          balanceBeforeCents: account.balanceCents,
          balanceAfterCents: balanceAfter,
          comment: params.comment ?? null,
          validatedBy: { connect: { id: params.validatedById } },
          occurredAt: new Date(),
        });
        await accountRepo.updateBalance(params.accountId, balanceAfter);
        return transaction;
      });
    },

    transfer(
      params: {
        fromAccountId: string;
        toAccountId: string;
        amountCents: number;
        comment?: string;
      } & ActorContext,
    ) {
      return prisma.$transaction(async (tx) => {
        const accountRepo = createChildAccountRepository(tx);
        const transactionRepo = createTransactionRepository(tx);

        const fromAccount = await assertOwnedByFamily(accountRepo, params.fromAccountId, params.familyId);
        const toAccount = await assertOwnedByFamily(accountRepo, params.toAccountId, params.familyId);
        assertAccountActive(fromAccount);
        assertAccountActive(toAccount);
        if (params.amountCents > fromAccount.balanceCents) {
          throw new InsufficientFundsError();
        }

        const transferGroupId = randomUUID();
        const fromBalanceAfter = fromAccount.balanceCents - params.amountCents;
        const toBalanceAfter = toAccount.balanceCents + params.amountCents;

        const debit = await transactionRepo.create({
          account: { connect: { id: params.fromAccountId } },
          type: 'TRANSFER',
          status: 'COMPLETED',
          amountCents: params.amountCents,
          balanceBeforeCents: fromAccount.balanceCents,
          balanceAfterCents: fromBalanceAfter,
          comment: params.comment ?? null,
          sender: { connect: { id: fromAccount.userId } },
          receiver: { connect: { id: toAccount.userId } },
          validatedBy: { connect: { id: params.validatedById } },
          transferGroupId,
          occurredAt: new Date(),
        });
        const credit = await transactionRepo.create({
          account: { connect: { id: params.toAccountId } },
          type: 'TRANSFER',
          status: 'COMPLETED',
          amountCents: params.amountCents,
          balanceBeforeCents: toAccount.balanceCents,
          balanceAfterCents: toBalanceAfter,
          comment: params.comment ?? null,
          sender: { connect: { id: fromAccount.userId } },
          receiver: { connect: { id: toAccount.userId } },
          validatedBy: { connect: { id: params.validatedById } },
          transferGroupId,
          occurredAt: new Date(),
        });

        await accountRepo.updateBalance(params.fromAccountId, fromBalanceAfter);
        await accountRepo.updateBalance(params.toAccountId, toBalanceAfter);

        return [debit, credit];
      });
    },

    correctTransaction(params: { transactionId: string; comment?: string } & ActorContext) {
      return prisma.$transaction(async (tx) => {
        const accountRepo = createChildAccountRepository(tx);
        const transactionRepo = createTransactionRepository(tx);
        const auditLogRepo = createAuditLogRepository(tx);

        const original = await transactionRepo.findByIdOrThrow(params.transactionId);
        await assertOwnedByFamily(accountRepo, original.accountId, params.familyId);

        const existingReversal = await transactionRepo.findReversalOf(original.id);
        if (existingReversal) {
          throw new AlreadyReversedError();
        }

        const legs: Transaction[] = original.transferGroupId
          ? await transactionRepo.findByTransferGroupId(original.transferGroupId)
          : [original];

        const correctionGroupId = legs.length > 1 ? randomUUID() : undefined;
        const corrections = [];

        for (const leg of legs) {
          const account = await accountRepo.findByIdOrThrow(leg.accountId);
          const originalDelta = leg.balanceAfterCents - leg.balanceBeforeCents;
          const balanceAfter = account.balanceCents - originalDelta;

          const correction = await transactionRepo.create({
            account: { connect: { id: leg.accountId } },
            type: 'CORRECTION',
            status: 'COMPLETED',
            amountCents: Math.abs(originalDelta),
            balanceBeforeCents: account.balanceCents,
            balanceAfterCents: balanceAfter,
            comment: params.comment ?? `Correction de l'opération du ${leg.occurredAt.toISOString().slice(0, 10)}`,
            validatedBy: { connect: { id: params.validatedById } },
            reversalOf: { connect: { id: leg.id } },
            transferGroupId: correctionGroupId,
            occurredAt: new Date(),
          });
          await accountRepo.updateBalance(leg.accountId, balanceAfter);
          corrections.push(correction);
        }

        await auditLogRepo.record({
          actorId: params.validatedById,
          action: 'TRANSACTION_CORRECTED',
          entityType: 'Transaction',
          entityId: original.id,
        });

        return corrections;
      });
    },
  };
}

export type MoneyService = ReturnType<typeof createMoneyService>;
