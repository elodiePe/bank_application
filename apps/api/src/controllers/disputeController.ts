import type { Request, Response } from 'express';
import { createDisputeSchema } from '@banque-familiale/shared';
import type { DisputeService } from '../services/disputeService.js';
import { ValidationError } from '../utils/errors.js';

export function createDisputeController(disputeService: DisputeService) {
  return {
    async create(req: Request, res: Response) {
      const parsed = createDisputeSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const dispute = await disputeService.raise({
        ...parsed.data,
        raisedById: req.auth!.sub,
        familyId: req.auth!.familyId,
      });
      res.status(201).json(dispute);
    },

    async listMine(req: Request, res: Response) {
      const disputes = await disputeService.listMine(req.auth!.sub);
      res.json(disputes);
    },

    async listPending(req: Request, res: Response) {
      const disputes = await disputeService.listPendingForFamily(req.auth!.familyId);
      res.json(disputes);
    },

    async dismiss(req: Request, res: Response) {
      const dispute = await disputeService.dismiss({
        disputeId: String(req.params.id),
        actorId: req.auth!.sub,
        actorFamilyId: req.auth!.familyId,
      });
      res.json(dispute);
    },

    async resolve(req: Request, res: Response) {
      const dispute = await disputeService.resolve({
        disputeId: String(req.params.id),
        actorId: req.auth!.sub,
        actorFamilyId: req.auth!.familyId,
      });
      res.json(dispute);
    },
  };
}

export type DisputeController = ReturnType<typeof createDisputeController>;
