import type { FamilySettings } from '@banque-familiale/shared';
import { SUBSCRIPTION_TIER_SECTIONS_UNLOCKED } from '@banque-familiale/shared';
import type { PrismaClient } from '@prisma/client';
import { createSettingsRepository } from '../repositories/settingsRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { createFamilyRepository } from '../repositories/familyRepository.js';
import { ForbiddenError } from '../utils/errors.js';

function toFamilySettings(s: {
  defaultInterestRateBps: number;
  currency: string;
  stocksEnabled: boolean;
  mealPlanEnabled: boolean;
  shoppingListEnabled: boolean;
  laundryEnabled: boolean;
}): FamilySettings {
  return {
    defaultInterestRateBps: s.defaultInterestRateBps,
    currency: s.currency,
    stocksEnabled: s.stocksEnabled,
    mealPlanEnabled: s.mealPlanEnabled,
    shoppingListEnabled: s.shoppingListEnabled,
    laundryEnabled: s.laundryEnabled,
  };
}

export function createSettingsService(prisma: PrismaClient) {
  return {
    async getSettings(familyId: string): Promise<FamilySettings> {
      const settingsRepo = createSettingsRepository(prisma);
      return toFamilySettings(await settingsRepo.findByFamilyIdOrThrow(familyId));
    },

    async updateInterestRate(params: {
      familyId: string;
      rateBps: number;
      actorId: string;
    }): Promise<FamilySettings> {
      return prisma.$transaction(async (tx) => {
        const settingsRepo = createSettingsRepository(tx);
        const auditLogRepo = createAuditLogRepository(tx);

        const updated = await settingsRepo.updateInterestRate(params.familyId, params.rateBps);
        await auditLogRepo.record({
          actorId: params.actorId,
          action: 'INTEREST_RATE_UPDATED',
          entityType: 'Settings',
          entityId: updated.id,
          metadata: { newRateBps: params.rateBps },
        });

        return toFamilySettings(updated);
      });
    },

    async updateCurrency(params: { familyId: string; currency: string; actorId: string }): Promise<FamilySettings> {
      return prisma.$transaction(async (tx) => {
        const settingsRepo = createSettingsRepository(tx);
        const auditLogRepo = createAuditLogRepository(tx);

        const updated = await settingsRepo.updateCurrency(params.familyId, params.currency);
        await auditLogRepo.record({
          actorId: params.actorId,
          action: 'CURRENCY_UPDATED',
          entityType: 'Settings',
          entityId: updated.id,
          metadata: { newCurrency: params.currency },
        });

        return toFamilySettings(updated);
      });
    },

    async updateFeatureFlags(params: {
      familyId: string;
      actorId: string;
      flags: {
        stocksEnabled?: boolean;
        mealPlanEnabled?: boolean;
        shoppingListEnabled?: boolean;
        laundryEnabled?: boolean;
      };
    }): Promise<FamilySettings> {
      const enablingAnySection = Object.values(params.flags).some((v) => v === true);
      if (enablingAnySection) {
        const familyRepo = createFamilyRepository(prisma);
        const family = await familyRepo.findById(params.familyId);
        if (family && !SUBSCRIPTION_TIER_SECTIONS_UNLOCKED[family.subscriptionTier]) {
          throw new ForbiddenError(
            'Ces sections sont réservées aux plans Famille et Grande Famille. Passez à un plan supérieur pour les activer.',
          );
        }
      }

      return prisma.$transaction(async (tx) => {
        const settingsRepo = createSettingsRepository(tx);
        const auditLogRepo = createAuditLogRepository(tx);

        const updated = await settingsRepo.updateFeatureFlags(params.familyId, params.flags);
        await auditLogRepo.record({
          actorId: params.actorId,
          action: 'FEATURE_FLAGS_UPDATED',
          entityType: 'Settings',
          entityId: updated.id,
          metadata: params.flags,
        });

        return toFamilySettings(updated);
      });
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
