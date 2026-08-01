import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateShoppingListItemInput } from '@banque-familiale/shared';
import {
  clearCheckedShoppingListItems,
  createShoppingListItem,
  deleteShoppingListItem,
  fetchShoppingList,
  notifyShoppingTrip,
  setShoppingListItemChecked,
} from '../services/shoppingList.service.js';

export function useShoppingList() {
  return useQuery({ queryKey: ['shopping-list'], queryFn: fetchShoppingList, staleTime: 15_000 });
}

function useInvalidateShoppingList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
}

export function useCreateShoppingListItem() {
  const invalidate = useInvalidateShoppingList();
  return useMutation({
    mutationFn: (input: CreateShoppingListItemInput) => createShoppingListItem(input),
    onSuccess: invalidate,
  });
}

export function useSetShoppingListItemChecked() {
  const invalidate = useInvalidateShoppingList();
  return useMutation({
    mutationFn: ({ id, isChecked }: { id: string; isChecked: boolean }) => setShoppingListItemChecked(id, isChecked),
    onSuccess: invalidate,
  });
}

export function useDeleteShoppingListItem() {
  const invalidate = useInvalidateShoppingList();
  return useMutation({
    mutationFn: (id: string) => deleteShoppingListItem(id),
    onSuccess: invalidate,
  });
}

export function useNotifyShoppingTrip() {
  return useMutation({ mutationFn: notifyShoppingTrip });
}

export function useClearCheckedShoppingListItems() {
  const invalidate = useInvalidateShoppingList();
  return useMutation({
    mutationFn: clearCheckedShoppingListItems,
    onSuccess: invalidate,
  });
}
