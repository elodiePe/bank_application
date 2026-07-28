import type { Request, Response } from 'express';
import { setMealPlanDaySchema, setMealPlanRotationOrderSchema } from '@banque-familiale/shared';
import type { MealPlanService } from '../services/mealPlanService.js';
import { ValidationError } from '../utils/errors.js';

export function createMealPlanController(mealPlanService: MealPlanService) {
  return {
    async list(req: Request, res: Response) {
      const config = await mealPlanService.list(req.auth!.familyId);
      res.json(config);
    },

    async listUpcoming(req: Request, res: Response) {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 31);
      const summaries = await mealPlanService.listUpcoming(req.auth!.familyId, days);
      res.json(summaries);
    },

    async getRotationOrder(req: Request, res: Response) {
      const order = await mealPlanService.getRotationOrder(req.auth!.familyId);
      res.json(order);
    },

    async setRotationOrder(req: Request, res: Response) {
      const parsed = setMealPlanRotationOrderSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const order = await mealPlanService.setRotationOrder({
        familyId: req.auth!.familyId,
        orderedUserIds: parsed.data.orderedUserIds,
      });
      res.json(order);
    },

    async setDay(req: Request, res: Response) {
      const parsed = setMealPlanDaySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const config = await mealPlanService.setDay({
        familyId: req.auth!.familyId,
        weekday: parsed.data.weekday,
        mode: parsed.data.mode,
        fixedUserId: parsed.data.fixedUserId,
      });
      res.json(config);
    },
  };
}

export type MealPlanController = ReturnType<typeof createMealPlanController>;
