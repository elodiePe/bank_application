import type { Request, Response } from 'express';
import {
  correctionSchema,
  depositSchema,
  transferSchema,
  withdrawalSchema,
} from '@banque-familiale/shared';
import type { MoneyService } from '../services/moneyService.js';
import type { NotificationService } from '../services/notificationService.js';
import type { ChildAccountRepository } from '../repositories/childAccountRepository.js';
import { ValidationError } from '../utils/errors.js';

export function createTransactionActionsController(
  moneyService: MoneyService,
  notificationService: NotificationService,
  childAccountRepository: ChildAccountRepository,
) {
  return {
    async deposit(req: Request, res: Response) {
      const parsed = depositSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const transaction = await moneyService.deposit({
        ...parsed.data,
        familyId: req.auth!.familyId,
        validatedById: req.auth!.sub,
      });

      const account = await childAccountRepository.findByIdOrThrow(parsed.data.accountId);
      await notificationService.notifyDeposit({
        userId: account.userId,
        amountCents: transaction.amountCents,
        transactionId: transaction.id,
      });

      res.status(201).json(transaction);
    },

    async withdrawal(req: Request, res: Response) {
      const parsed = withdrawalSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const transaction = await moneyService.withdrawal({
        ...parsed.data,
        familyId: req.auth!.familyId,
        validatedById: req.auth!.sub,
      });

      const account = await childAccountRepository.findByIdOrThrow(parsed.data.accountId);
      await notificationService.notifyWithdrawal({
        userId: account.userId,
        amountCents: transaction.amountCents,
        transactionId: transaction.id,
      });

      res.status(201).json(transaction);
    },

    async transfer(req: Request, res: Response) {
      const parsed = transferSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const [debit, credit] = await moneyService.transfer({
        ...parsed.data,
        familyId: req.auth!.familyId,
        validatedById: req.auth!.sub,
      });

      const [fromAccount, toAccount] = await Promise.all([
        childAccountRepository.findByIdOrThrow(parsed.data.fromAccountId),
        childAccountRepository.findByIdOrThrow(parsed.data.toAccountId),
      ]);
      await notificationService.notifyTransfer({
        fromUserId: fromAccount.userId,
        toUserId: toAccount.userId,
        fromFirstName: fromAccount.user.firstName,
        toFirstName: toAccount.user.firstName,
        amountCents: debit!.amountCents,
        transactionId: credit!.id,
      });

      res.status(201).json([debit, credit]);
    },

    async correct(req: Request, res: Response) {
      const parsed = correctionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const transactionId = String(req.params.id);
      const corrections = await moneyService.correctTransaction({
        transactionId,
        comment: parsed.data.comment,
        familyId: req.auth!.familyId,
        validatedById: req.auth!.sub,
      });

      for (const correction of corrections) {
        const account = await childAccountRepository.findByIdOrThrow(correction.accountId);
        await notificationService.notifyCorrection({
          userId: account.userId,
          amountCents: correction.amountCents,
          transactionId: correction.id,
        });
      }

      res.status(201).json(corrections);
    },
  };
}

export type TransactionActionsController = ReturnType<typeof createTransactionActionsController>;
