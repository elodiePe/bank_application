import { z } from 'zod';

export interface ShoppingListItemSummary {
  id: string;
  label: string;
  isChecked: boolean;
  addedByFirstName: string;
  checkedByFirstName: string | null;
  createdAt: string;
}

export const createShoppingListItemSchema = z.object({
  label: z.string().trim().min(1, 'Le nom est requis').max(80),
});
export type CreateShoppingListItemInput = z.infer<typeof createShoppingListItemSchema>;

export const setShoppingListItemCheckedSchema = z.object({
  isChecked: z.boolean(),
});
export type SetShoppingListItemCheckedInput = z.infer<typeof setShoppingListItemCheckedSchema>;
