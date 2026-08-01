import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createMaintenanceService, type MaintenanceService } from './maintenanceService.js';

describe('maintenanceService (seeded demo family)', () => {
  let db: TestDb;
  let service: MaintenanceService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createMaintenanceService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('purges notification-send logs older than 30 days, but keeps recent ones', async () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const recent = new Date();

    await db.prisma.mealCookNotificationLog.createMany({
      data: [
        { familyId: 'demo-family', date: old, kind: 'TODAY', userId: 'demo-elodie', createdAt: old },
        { familyId: 'demo-family', date: recent, kind: 'TODAY', userId: 'demo-matthieu', createdAt: recent },
      ],
    });
    const customNotification = await db.prisma.customNotification.create({
      data: { familyId: 'demo-family', title: 'Test', body: 'Test', date: recent, createdById: 'demo-papa' },
    });
    await db.prisma.customNotificationLog.createMany({
      data: [
        { customNotificationId: customNotification.id, date: old, createdAt: old },
      ],
    });

    const result = await service.purgeOldNotificationLogs();
    expect(result.meal).toBe(1);
    expect(result.custom).toBe(1);

    expect(await db.prisma.mealCookNotificationLog.count()).toBe(1);
    const [remaining] = await db.prisma.mealCookNotificationLog.findMany();
    expect(remaining!.userId).toBe('demo-matthieu');
    expect(await db.prisma.customNotificationLog.count()).toBe(0);
  });
});
