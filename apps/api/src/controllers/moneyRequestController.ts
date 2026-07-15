import type { Request, Response } from 'express';
import { createMoneyRequestSchema } from '@banque-familiale/shared';
import type { MoneyRequestService } from '../services/moneyRequestService.js';
import { ValidationError } from '../utils/errors.js';

export function createMoneyRequestController(moneyRequestService: MoneyRequestService) {
  return {
    async create(req: Request, res: Response) {
      const parsed = createMoneyRequestSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const request = await moneyRequestService.createRequest({
        ...parsed.data,
        requesterId: req.auth!.sub,
        familyId: req.auth!.familyId,
      });
      res.status(201).json(request);
    },

    async listMine(req: Request, res: Response) {
      const requests = await moneyRequestService.listMine(req.auth!.sub);
      res.json(requests);
    },

    async listPending(req: Request, res: Response) {
      const requests = await moneyRequestService.listPendingForFamily(req.auth!.familyId);
      res.json(requests);
    },

    async approve(req: Request, res: Response) {
      const request = await moneyRequestService.approve({
        requestId: String(req.params.id),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        actorFamilyId: req.auth!.familyId,
      });
      res.json(request);
    },

    async reject(req: Request, res: Response) {
      const request = await moneyRequestService.reject({
        requestId: String(req.params.id),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role,
        actorFamilyId: req.auth!.familyId,
      });
      res.json(request);
    },

    async cancel(req: Request, res: Response) {
      const request = await moneyRequestService.cancel({
        requestId: String(req.params.id),
        actorId: req.auth!.sub,
      });
      res.json(request);
    },
  };
}

export type MoneyRequestController = ReturnType<typeof createMoneyRequestController>;
