import type { Request, Response } from 'express';
import { createChoreSchema, updateChoreSchema } from '@banque-familiale/shared';
import type { ChoreService } from '../services/choreService.js';
import { ValidationError } from '../utils/errors.js';

export function createChoreController(choreService: ChoreService) {
  return {
    async listFamilyChores(req: Request, res: Response) {
      const chores = await choreService.listFamilyChores(req.auth!.familyId);
      res.json(chores);
    },

    async listMyChores(req: Request, res: Response) {
      const chores = await choreService.listMyChores(req.auth!.sub);
      res.json(chores);
    },

    async listPendingCompletions(req: Request, res: Response) {
      const completions = await choreService.listPendingCompletions(req.auth!.familyId);
      res.json(completions);
    },

    async create(req: Request, res: Response) {
      const parsed = createChoreSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const chore = await choreService.createChore({
        familyId: req.auth!.familyId,
        ...parsed.data,
      });
      res.status(201).json(chore);
    },

    async update(req: Request, res: Response) {
      const parsed = updateChoreSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const chore = await choreService.updateChore({
        familyId: req.auth!.familyId,
        choreId: String(req.params.id),
        ...parsed.data,
      });
      res.json(chore);
    },

    async complete(req: Request, res: Response) {
      const completion = await choreService.completeChore({
        familyId: req.auth!.familyId,
        childUserId: req.auth!.sub,
        choreId: String(req.params.id),
      });
      res.status(201).json(completion);
    },

    async approve(req: Request, res: Response) {
      const completion = await choreService.approveCompletion({
        familyId: req.auth!.familyId,
        actorId: req.auth!.sub,
        completionId: String(req.params.completionId),
      });
      res.json(completion);
    },

    async reject(req: Request, res: Response) {
      const completion = await choreService.rejectCompletion({
        familyId: req.auth!.familyId,
        actorId: req.auth!.sub,
        completionId: String(req.params.completionId),
      });
      res.json(completion);
    },
  };
}

export type ChoreController = ReturnType<typeof createChoreController>;
