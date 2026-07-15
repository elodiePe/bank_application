import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createPushService, type PushService } from './pushService.js';

describe('pushService (seeded demo family)', () => {
  let db: TestDb;
  let service: PushService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createPushService(db.prisma);
  });

  afterAll(() => db.teardown());

  beforeEach(() => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue(undefined);
  });

  it('sends nothing for a user with no saved subscription', async () => {
    await service.sendToUser('demo-elodie', { title: 'Titre', body: 'Corps' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('sends to every subscription saved for a user', async () => {
    await service.saveSubscription('demo-elodie', {
      endpoint: 'https://push.example/device-a',
      p256dh: 'p256dh-a',
      auth: 'auth-a',
    });
    await service.saveSubscription('demo-elodie', {
      endpoint: 'https://push.example/device-b',
      p256dh: 'p256dh-b',
      auth: 'auth-b',
    });

    await service.sendToUser('demo-elodie', { title: 'Dépôt reçu', body: '10.00 CHF' });

    expect(sendNotification).toHaveBeenCalledTimes(2);
    const endpoints = sendNotification.mock.calls.map(([sub]) => (sub as { endpoint: string }).endpoint);
    expect(endpoints.sort()).toEqual(['https://push.example/device-a', 'https://push.example/device-b']);
  });

  it('re-subscribing the same endpoint updates it instead of duplicating it', async () => {
    await service.saveSubscription('demo-matthieu', {
      endpoint: 'https://push.example/shared-device',
      p256dh: 'first',
      auth: 'first',
    });
    // Same device, now logged in as a different child — ownership should move.
    await service.saveSubscription('demo-damien', {
      endpoint: 'https://push.example/shared-device',
      p256dh: 'second',
      auth: 'second',
    });

    await service.sendToUser('demo-matthieu', { title: 'x', body: 'y' });
    expect(sendNotification).not.toHaveBeenCalled();

    await service.sendToUser('demo-damien', { title: 'x', body: 'y' });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('self-cleans a subscription that the push service reports as gone (410)', async () => {
    await service.saveSubscription('demo-papa', {
      endpoint: 'https://push.example/expired-device',
      p256dh: 'p',
      auth: 'a',
    });
    sendNotification.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));

    await service.sendToUser('demo-papa', { title: 'x', body: 'y' });
    sendNotification.mockClear();

    // Second send finds no subscriptions left — proves the expired one was deleted.
    await service.sendToUser('demo-papa', { title: 'x', body: 'y' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('sendToUsers fans out across multiple recipients in one call', async () => {
    await service.saveSubscription('demo-maman', {
      endpoint: 'https://push.example/maman-device',
      p256dh: 'p',
      auth: 'a',
    });
    sendNotification.mockClear();

    // demo-damien's subscription was re-pointed to itself in an earlier test.
    await service.sendToUsers(['demo-maman', 'demo-damien'], { title: 'x', body: 'y' });

    expect(sendNotification).toHaveBeenCalledTimes(2);
  });
});
