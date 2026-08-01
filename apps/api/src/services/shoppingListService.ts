import type { PrismaClient, ShoppingListItem, User } from '@prisma/client';
import type { ShoppingListItemSummary } from '@banque-familiale/shared';
import { createShoppingListRepository } from '../repositories/shoppingListRepository.js';
import { createNotificationService } from './notificationService.js';
import { NotFoundError } from '../utils/errors.js';

type ItemWithUsers = ShoppingListItem & { addedBy: User; checkedBy: User | null };

function toSummary(item: ItemWithUsers): ShoppingListItemSummary {
  return {
    id: item.id,
    label: item.label,
    isChecked: item.isChecked,
    addedByFirstName: item.addedBy.firstName,
    checkedByFirstName: item.checkedBy?.firstName ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

export function createShoppingListService(prisma: PrismaClient) {
  const repo = createShoppingListRepository(prisma);
  const notificationService = createNotificationService(prisma);

  async function assertInFamily(id: string, familyId: string) {
    const item = await repo.findByIdOrThrow(id);
    if (item.familyId !== familyId) throw new NotFoundError('Article introuvable');
    return item;
  }

  return {
    async list(familyId: string): Promise<ShoppingListItemSummary[]> {
      const items = await repo.listForFamily(familyId);
      return items.map(toSummary);
    },

    async create(params: { familyId: string; addedById: string; label: string }): Promise<ShoppingListItemSummary> {
      const item = await repo.create({
        familyId: params.familyId,
        label: params.label,
        addedBy: { connect: { id: params.addedById } },
      });
      return toSummary(item);
    },

    async setChecked(params: {
      familyId: string;
      itemId: string;
      isChecked: boolean;
      checkedById: string;
    }): Promise<ShoppingListItemSummary> {
      await assertInFamily(params.itemId, params.familyId);
      const item = await repo.setChecked(params.itemId, params.isChecked, params.isChecked ? params.checkedById : null);
      return toSummary(item);
    },

    async delete(params: { familyId: string; itemId: string }): Promise<void> {
      await assertInFamily(params.itemId, params.familyId);
      await repo.delete(params.itemId);
    },

    /** Bulk-clears everything already checked off — the "course finie" action, once whoever
     * went shopping is back and has ticked off what they bought. */
    async clearChecked(params: { familyId: string }): Promise<void> {
      await repo.deleteAllChecked(params.familyId);
    },

    async notifyGoingShopping(params: { familyId: string; requesterId: string }): Promise<void> {
      await notificationService.notifyShoppingTrip(params);
    },
  };
}

export type ShoppingListService = ReturnType<typeof createShoppingListService>;
