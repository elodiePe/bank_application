import type { PrismaClient } from '@prisma/client';

const RETENTION_DAYS = 30;

export function createMaintenanceService(prisma: PrismaClient) {
  return {
    /// These three tables are pure same-day "already sent this reminder" idempotency markers
    /// (each has a unique constraint keyed on today's date) — once a day has passed, its rows
    /// never need to be checked again, so they're safe to purge after a wide safety margin.
    /// Unlike InterestHistory/AllowanceHistory, which must be kept forever: those guard against
    /// double-crediting money on a much longer (month/week-since-eligibility) lookback window.
    async purgeOldNotificationLogs(): Promise<{ meal: number; laundry: number; custom: number }> {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      const [meal, laundry, custom] = await Promise.all([
        prisma.mealCookNotificationLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
        prisma.laundryNotificationLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
        prisma.customNotificationLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      ]);

      return { meal: meal.count, laundry: laundry.count, custom: custom.count };
    },
  };
}

export type MaintenanceService = ReturnType<typeof createMaintenanceService>;
