import type { Request, Response } from 'express';
import { createPersonalTaskSchema, updatePersonalTaskSchema } from '@banque-familiale/shared';
import type { PersonalTaskService } from '../services/personalTaskService.js';
import { ValidationError } from '../utils/errors.js';

export function createPersonalTaskController(service: PersonalTaskService) {
  return {
    async listMine(req: Request, res: Response) {
      const tasks = await service.listMine(req.auth!.sub);
      res.json(tasks);
    },

    async create(req: Request, res: Response) {
      const parsed = createPersonalTaskSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const task = await service.create({
        familyId: req.auth!.familyId,
        userId: req.auth!.sub,
        title: parsed.data.title,
        recurring: parsed.data.recurring,
        date: parsed.data.date,
      });
      res.status(201).json(task);
    },

    async update(req: Request, res: Response) {
      const parsed = updatePersonalTaskSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const task = await service.update({ id: String(req.params.id), userId: req.auth!.sub, ...parsed.data });
      res.json(task);
    },

    async remove(req: Request, res: Response) {
      await service.remove({ id: String(req.params.id), userId: req.auth!.sub });
      res.status(204).end();
    },
  };
}

export type PersonalTaskController = ReturnType<typeof createPersonalTaskController>;
