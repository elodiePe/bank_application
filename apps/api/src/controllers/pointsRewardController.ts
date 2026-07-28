import type { Request, Response } from 'express';
import { createPointsRewardSchema } from '@banque-familiale/shared';
import type { PointsRewardService } from '../services/pointsRewardService.js';
import { ValidationError } from '../utils/errors.js';

export function createPointsRewardController(pointsRewardService: PointsRewardService) {
  return {
    async list(req: Request, res: Response) {
      const rewards = await pointsRewardService.list(req.auth!.familyId);
      res.json(rewards);
    },

    async create(req: Request, res: Response) {
      const parsed = createPointsRewardSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const reward = await pointsRewardService.create({
        familyId: req.auth!.familyId,
        childUserId: parsed.data.childUserId,
        title: parsed.data.title,
        pointsRequired: parsed.data.pointsRequired,
      });
      res.status(201).json(reward);
    },

    async remove(req: Request, res: Response) {
      await pointsRewardService.delete({ familyId: req.auth!.familyId, rewardId: String(req.params.id) });
      res.status(204).send();
    },
  };
}

export type PointsRewardController = ReturnType<typeof createPointsRewardController>;
