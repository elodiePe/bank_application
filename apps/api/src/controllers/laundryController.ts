import type { Request, Response } from 'express';
import {
  createLaundryTypeSchema,
  updateLaundryTypeSchema,
  reorderLaundryTypesSchema,
  setLaundryOccurrenceStatusSchema,
} from '@banque-familiale/shared';
import type { LaundryService } from '../services/laundryService.js';
import { ValidationError } from '../utils/errors.js';

export function createLaundryController(laundryService: LaundryService) {
  return {
    async list(req: Request, res: Response) {
      const types = await laundryService.list(req.auth!.familyId);
      res.json(types);
    },

    async listUpcoming(req: Request, res: Response) {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 31);
      const occurrences = await laundryService.listUpcoming(req.auth!.familyId, days);
      res.json(occurrences);
    },

    async create(req: Request, res: Response) {
      const parsed = createLaundryTypeSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const type = await laundryService.create({ familyId: req.auth!.familyId, ...parsed.data });
      res.status(201).json(type);
    },

    async update(req: Request, res: Response) {
      const parsed = updateLaundryTypeSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const type = await laundryService.update({
        id: String(req.params.id),
        familyId: req.auth!.familyId,
        ...parsed.data,
      });
      res.json(type);
    },

    async remove(req: Request, res: Response) {
      await laundryService.remove({ id: String(req.params.id), familyId: req.auth!.familyId });
      res.status(204).end();
    },

    async reorder(req: Request, res: Response) {
      const parsed = reorderLaundryTypesSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await laundryService.reorder({ familyId: req.auth!.familyId, orderedIds: parsed.data.orderedIds });
      res.status(204).end();
    },

    async setOccurrenceStatus(req: Request, res: Response) {
      const parsed = setLaundryOccurrenceStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await laundryService.setOccurrenceStatus({ familyId: req.auth!.familyId, ...parsed.data });
      res.status(204).end();
    },
  };
}

export type LaundryController = ReturnType<typeof createLaundryController>;
