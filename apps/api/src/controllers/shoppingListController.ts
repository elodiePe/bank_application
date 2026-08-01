import type { Request, Response } from 'express';
import { createShoppingListItemSchema, setShoppingListItemCheckedSchema } from '@banque-familiale/shared';
import type { ShoppingListService } from '../services/shoppingListService.js';
import { ValidationError } from '../utils/errors.js';

export function createShoppingListController(shoppingListService: ShoppingListService) {
  return {
    async list(req: Request, res: Response) {
      const items = await shoppingListService.list(req.auth!.familyId);
      res.json(items);
    },

    async create(req: Request, res: Response) {
      const parsed = createShoppingListItemSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const item = await shoppingListService.create({
        familyId: req.auth!.familyId,
        addedById: req.auth!.sub,
        label: parsed.data.label,
      });
      res.status(201).json(item);
    },

    async setChecked(req: Request, res: Response) {
      const parsed = setShoppingListItemCheckedSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const item = await shoppingListService.setChecked({
        familyId: req.auth!.familyId,
        itemId: String(req.params.id),
        isChecked: parsed.data.isChecked,
        checkedById: req.auth!.sub,
      });
      res.json(item);
    },

    async remove(req: Request, res: Response) {
      await shoppingListService.delete({ familyId: req.auth!.familyId, itemId: String(req.params.id) });
      res.status(204).send();
    },

    async clearChecked(req: Request, res: Response) {
      await shoppingListService.clearChecked({ familyId: req.auth!.familyId });
      res.status(204).send();
    },

    async notifyTrip(req: Request, res: Response) {
      await shoppingListService.notifyGoingShopping({ familyId: req.auth!.familyId, requesterId: req.auth!.sub });
      res.status(204).send();
    },
  };
}

export type ShoppingListController = ReturnType<typeof createShoppingListController>;
