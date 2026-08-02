import type { Db } from '../database/types.js';

export function createSettingsRepository(prisma: Db) {
  return {
    findByFamilyIdOrThrow(familyId: string) {
      return prisma.settings.findUniqueOrThrow({ where: { familyId } });
    },

    updateInterestRate(familyId: string, defaultInterestRateBps: number) {
      return prisma.settings.update({ where: { familyId }, data: { defaultInterestRateBps } });
    },

    updateCurrency(familyId: string, currency: string) {
      return prisma.settings.update({ where: { familyId }, data: { currency } });
    },

    updateFeatureFlags(
      familyId: string,
      data: {
        stocksEnabled?: boolean;
        mealPlanEnabled?: boolean;
        shoppingListEnabled?: boolean;
        laundryEnabled?: boolean;
      },
    ) {
      return prisma.settings.update({ where: { familyId }, data });
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
