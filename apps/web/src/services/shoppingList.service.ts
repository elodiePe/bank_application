import type { CreateShoppingListItemInput, ShoppingListItemSummary } from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './api.js';

export function fetchShoppingList(): Promise<ShoppingListItemSummary[]> {
  return apiGet<ShoppingListItemSummary[]>('/shopping-list');
}

export function createShoppingListItem(input: CreateShoppingListItemInput): Promise<ShoppingListItemSummary> {
  return apiPost<ShoppingListItemSummary>('/shopping-list', input);
}

export function setShoppingListItemChecked(id: string, isChecked: boolean): Promise<ShoppingListItemSummary> {
  return apiPatch<ShoppingListItemSummary>(`/shopping-list/${id}/checked`, { isChecked });
}

export function deleteShoppingListItem(id: string): Promise<void> {
  return apiDelete<void>(`/shopping-list/${id}`);
}

export function notifyShoppingTrip(): Promise<void> {
  return apiPost<void>('/shopping-list/notify-trip', {});
}

export function clearCheckedShoppingListItems(): Promise<void> {
  return apiDelete<void>('/shopping-list/checked');
}
