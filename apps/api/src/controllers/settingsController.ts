import type { Request, Response } from 'express';
import { currencySchema, interestRateSchema } from '@banque-familiale/shared';
import type { SettingsService } from '../services/settingsService.js';
import { ValidationError } from '../utils/errors.js';

export function createSettingsController(settingsService: SettingsService) {
  return {
    async getSettings(req: Request, res: Response) {
      const settings = await settingsService.getSettings(req.auth!.familyId);
      res.json(settings);
    },

    async updateInterestRate(req: Request, res: Response) {
      const parsed = interestRateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const settings = await settingsService.updateInterestRate({
        familyId: req.auth!.familyId,
        rateBps: parsed.data.rateBps,
        actorId: req.auth!.sub,
      });
      res.json(settings);
    },

    async updateCurrency(req: Request, res: Response) {
      const parsed = currencySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const settings = await settingsService.updateCurrency({
        familyId: req.auth!.familyId,
        currency: parsed.data.currency,
        actorId: req.auth!.sub,
      });
      res.json(settings);
    },
  };
}

export type SettingsController = ReturnType<typeof createSettingsController>;
