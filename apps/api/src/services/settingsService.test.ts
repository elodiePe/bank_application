import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createSettingsService, type SettingsService } from './settingsService.js';

describe('settingsService (seeded demo family)', () => {
  let db: TestDb;
  let settingsService: SettingsService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    settingsService = createSettingsService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('returns the default interest rate seeded for the family', async () => {
    const settings = await settingsService.getSettings('demo-family');
    expect(settings).toEqual({
      defaultInterestRateBps: 240,
      currency: 'CHF',
      stocksEnabled: false,
      mealPlanEnabled: false,
      shoppingListEnabled: false,
      laundryEnabled: false,
    });
  });

  it('updates the interest rate and records an audit log entry', async () => {
    const updated = await settingsService.updateInterestRate({
      familyId: 'demo-family',
      rateBps: 300,
      actorId: 'demo-papa',
    });

    expect(updated.defaultInterestRateBps).toBe(300);

    const settings = await settingsService.getSettings('demo-family');
    expect(settings.defaultInterestRateBps).toBe(300);

    const logs = await db.prisma.auditLog.findMany({ where: { action: 'INTEREST_RATE_UPDATED' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actorId: 'demo-papa', entityType: 'Settings' });
  });

  it('updates the currency and records an audit log entry', async () => {
    const updated = await settingsService.updateCurrency({
      familyId: 'demo-family',
      currency: 'EUR',
      actorId: 'demo-papa',
    });

    expect(updated.currency).toBe('EUR');

    const settings = await settingsService.getSettings('demo-family');
    expect(settings.currency).toBe('EUR');

    const logs = await db.prisma.auditLog.findMany({ where: { action: 'CURRENCY_UPDATED' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actorId: 'demo-papa', entityType: 'Settings' });
  });

  describe('subscription tier section gating', () => {
    it('refuses to enable a paid section on the free tier', async () => {
      // The seeded demo family defaults to ESSENTIEL, which doesn't unlock these sections.
      await expect(
        settingsService.updateFeatureFlags({
          familyId: 'demo-family',
          actorId: 'demo-papa',
          flags: { mealPlanEnabled: true },
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('allows disabling a section on the free tier (only enabling is gated)', async () => {
      const updated = await settingsService.updateFeatureFlags({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        flags: { mealPlanEnabled: false },
      });
      expect(updated.mealPlanEnabled).toBe(false);
    });

    it('allows enabling a section once the family is upgraded', async () => {
      await db.prisma.family.update({ where: { id: 'demo-family' }, data: { subscriptionTier: 'FAMILLE' } });

      const updated = await settingsService.updateFeatureFlags({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        flags: { mealPlanEnabled: true },
      });
      expect(updated.mealPlanEnabled).toBe(true);

      await db.prisma.family.update({ where: { id: 'demo-family' }, data: { subscriptionTier: 'ESSENTIEL' } });
    });
  });
});
