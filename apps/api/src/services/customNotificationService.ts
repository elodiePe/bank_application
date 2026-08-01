import type { PrismaClient } from '@prisma/client';
import type { CustomNotificationSummary } from '@banque-familiale/shared';
import { createCustomNotificationRepository } from '../repositories/customNotificationRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createNotificationService } from './notificationService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { getStartOfDay, weekdayIndex } from '../utils/dateWeek.js';

type MemberLookup = Map<string, { firstName: string }>;

export function createCustomNotificationService(prisma: PrismaClient) {
  const repo = createCustomNotificationRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const notificationService = createNotificationService(prisma);

  async function memberLookup(familyId: string): Promise<MemberLookup> {
    const members = await userRepo.listFamilyMembers(familyId);
    return new Map(members.map((m) => [m.id, { firstName: m.firstName }]));
  }

  function toSummary(
    n: Awaited<ReturnType<typeof repo.create>>,
    members: MemberLookup,
  ): CustomNotificationSummary {
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      date: n.date.toISOString().slice(0, 10),
      recurring: n.recurring,
      time: n.time,
      sendToAll: n.sendToAll,
      recipientUserIds: n.recipientUserIds,
      recipientFirstNames: n.recipientUserIds.map((id) => members.get(id)?.firstName ?? '?'),
      createdByFirstName: n.createdBy.firstName,
      createdAt: n.createdAt.toISOString(),
    };
  }

  return {
    async list(familyId: string): Promise<CustomNotificationSummary[]> {
      const [rows, members] = await Promise.all([repo.listForFamily(familyId), memberLookup(familyId)]);
      return rows.map((r) => toSummary(r, members));
    },

    async create(params: {
      familyId: string;
      createdById: string;
      title: string;
      body: string;
      date: string;
      recurring: boolean;
      time: string;
      sendToAll: boolean;
      recipientUserIds?: string[];
    }): Promise<CustomNotificationSummary> {
      const members = await memberLookup(params.familyId);
      if (!params.sendToAll) {
        for (const id of params.recipientUserIds ?? []) {
          if (!members.has(id)) throw new ValidationError('Destinataire invalide');
        }
      }
      const created = await repo.create({
        familyId: params.familyId,
        title: params.title,
        body: params.body,
        date: getStartOfDay(new Date(params.date)),
        recurring: params.recurring,
        time: params.time,
        sendToAll: params.sendToAll,
        recipientUserIds: params.sendToAll ? [] : (params.recipientUserIds ?? []),
        createdById: params.createdById,
      });
      return toSummary(created, members);
    },

    async remove(params: { id: string; familyId: string }): Promise<void> {
      const notification = await repo.findById(params.id);
      if (!notification || notification.familyId !== params.familyId) {
        throw new NotFoundError('Notification introuvable');
      }
      await repo.delete(params.id);
    },

    /** Runs every few minutes: sends every reminder due today whose scheduled `time` has
     * passed, once per calendar date. Checking frequently (rather than hourly) keeps the
     * actual send within a few minutes of the time the parent picked. */
    async processDaily(now: Date = new Date()): Promise<number> {
      const today = getStartOfDay(now);
      const weekday = weekdayIndex(today);
      const nowHHmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
      const dueNotifications = await repo.listDueForDate(today, weekday);
      let sent = 0;

      for (const notification of dueNotifications) {
        if (notification.time > nowHHmm) continue;

        const existingLog = await repo.findLog(notification.id, today);
        if (existingLog) continue;

        const recipientIds = notification.sendToAll
          ? (await userRepo.listFamilyMembers(notification.familyId)).map((m) => m.id)
          : notification.recipientUserIds;

        await Promise.all(
          recipientIds.map((userId) =>
            notificationService.notifyCustom({ userId, title: notification.title, body: notification.body }),
          ),
        );
        await repo.createLog(notification.id, today);
        sent += 1;
      }

      return sent;
    },
  };
}

export type CustomNotificationService = ReturnType<typeof createCustomNotificationService>;
