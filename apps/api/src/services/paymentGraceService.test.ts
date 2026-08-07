import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/env.js', () => ({
  env: { webAppUrl: 'http://localhost:5173' },
}));

const sendEmailMock = vi.fn().mockResolvedValue(undefined);
vi.mock('./emailService.js', () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }));

import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createPaymentGraceService, type PaymentGraceService } from './paymentGraceService.js';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe('paymentGraceService.checkGracePeriods (seeded demo family)', () => {
  let db: TestDb;
  let service: PaymentGraceService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createPaymentGraceService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('does nothing for a family that never entered a grace period', async () => {
    const { reminded, deleted } = await service.checkGracePeriods();
    expect(reminded).toBe(0);
    expect(deleted).toBe(0);
    sendEmailMock.mockClear();
  });

  it('sends the J-7 reminder once, at day 23, and never resends it', async () => {
    await db.prisma.family.update({
      where: { id: 'demo-family' },
      data: { paymentGracePeriodStartedAt: daysAgo(24) },
    });

    const first = await service.checkGracePeriods();
    expect(first.reminded).toBe(1);
    expect(first.deleted).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: 'demo-family' } });
    expect(family.paymentGraceReminderSentAt).not.toBeNull();

    sendEmailMock.mockClear();
    const second = await service.checkGracePeriods();
    expect(second.reminded).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('deletes the family and emails a data export once 30 days have passed', async () => {
    await db.prisma.family.update({
      where: { id: 'demo-family' },
      data: { paymentGracePeriodStartedAt: daysAgo(31) },
    });
    sendEmailMock.mockClear();

    const { deleted } = await service.checkGracePeriods();
    expect(deleted).toBe(1);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const callArgs = sendEmailMock.mock.calls[0]![0] as { to: string; attachments?: { filename: string }[] };
    expect(callArgs.to).toBe('owner@banque-familiale.local');
    expect(callArgs.attachments?.[0]?.filename).toBe('mes-donnees.json');

    const family = await db.prisma.family.findUnique({ where: { id: 'demo-family' } });
    expect(family).toBeNull();
  });
});
