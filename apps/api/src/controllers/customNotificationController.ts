import type { Request, Response } from 'express';
import { createCustomNotificationSchema } from '@banque-familiale/shared';
import type { CustomNotificationService } from '../services/customNotificationService.js';
import { ValidationError } from '../utils/errors.js';

export function createCustomNotificationController(service: CustomNotificationService) {
  return {
    async list(req: Request, res: Response) {
      const notifications = await service.list(req.auth!.familyId);
      res.json(notifications);
    },

    async create(req: Request, res: Response) {
      const parsed = createCustomNotificationSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const notification = await service.create({
        familyId: req.auth!.familyId,
        createdById: req.auth!.sub,
        ...parsed.data,
      });
      res.status(201).json(notification);
    },

    async remove(req: Request, res: Response) {
      await service.remove({ id: String(req.params.id), familyId: req.auth!.familyId });
      res.status(204).end();
    },
  };
}

export type CustomNotificationController = ReturnType<typeof createCustomNotificationController>;
