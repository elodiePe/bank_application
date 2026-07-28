import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

const withUsers = {
  addedBy: true,
  checkedBy: true,
} satisfies Prisma.ShoppingListItemInclude;

export function createShoppingListRepository(prisma: Db) {
  return {
    listForFamily(familyId: string) {
      return prisma.shoppingListItem.findMany({
        where: { familyId },
        include: withUsers,
        orderBy: [{ isChecked: 'asc' }, { createdAt: 'desc' }],
      });
    },

    create(data: Prisma.ShoppingListItemCreateInput) {
      return prisma.shoppingListItem.create({ data, include: withUsers });
    },

    findByIdOrThrow(id: string) {
      return prisma.shoppingListItem.findUniqueOrThrow({ where: { id }, include: withUsers });
    },

    setChecked(id: string, isChecked: boolean, checkedById: string | null) {
      return prisma.shoppingListItem.update({
        where: { id },
        data: { isChecked, checkedById },
        include: withUsers,
      });
    },

    async delete(id: string) {
      await prisma.shoppingListItem.delete({ where: { id } });
    },
  };
}

export type ShoppingListRepository = ReturnType<typeof createShoppingListRepository>;
