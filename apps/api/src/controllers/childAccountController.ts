import type { Request, Response } from 'express';
import { weeklyAllowanceSchema } from '@banque-familiale/shared';
import type { AllowanceService } from '../services/allowanceService.js';
import { ValidationError } from '../utils/errors.js';

export function createChildAccountController(allowanceService: AllowanceService) {
  return {
    async setWeeklyAllowance(req: Request, res: Response) {
      const parsed = weeklyAllowanceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await allowanceService.setWeeklyAllowance({
        accountId: String(req.params.accountId),
        familyId: req.auth!.familyId,
        amountCents: parsed.data.amountCents,
      });
      res.status(204).end();
    },
  };
}

export type ChildAccountController = ReturnType<typeof createChildAccountController>;
