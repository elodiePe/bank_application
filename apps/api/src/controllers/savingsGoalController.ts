import type { Request, Response } from 'express';
import { upsertSavingsGoalSchema } from '@banque-familiale/shared';
import type { SavingsGoalService } from '../services/savingsGoalService.js';
import { ValidationError } from '../utils/errors.js';

export function createSavingsGoalController(service: SavingsGoalService) {
  return {
    async getMine(req: Request, res: Response) {
      const goal = await service.getMine(req.auth!.sub);
      res.json(goal);
    },

    async upsertMine(req: Request, res: Response) {
      const parsed = upsertSavingsGoalSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const goal = await service.upsertMine({
        familyId: req.auth!.familyId,
        userId: req.auth!.sub,
        title: parsed.data.title,
        targetCents: parsed.data.targetCents,
        photoDataUrl: parsed.data.photoDataUrl,
      });
      res.json(goal);
    },

    async deleteMine(req: Request, res: Response) {
      await service.deleteMine(req.auth!.sub);
      res.status(204).send();
    },
  };
}

export type SavingsGoalController = ReturnType<typeof createSavingsGoalController>;
