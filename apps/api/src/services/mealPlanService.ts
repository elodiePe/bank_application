import type { MealPlanSlot, PrismaClient } from '@prisma/client';
import type {
  MealPlanChoreConfigSummary,
  MealPlanDayConfig,
  MealPlanDaySummary,
  MealPlanRotationOrderSummary,
} from '@banque-familiale/shared';
import { createMealPlanRepository } from '../repositories/mealPlanRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createNotificationService } from './notificationService.js';
import { createChoreService } from './choreService.js';
import { ValidationError } from '../utils/errors.js';
import { getStartOfDay, weekdayIndex, weekIndexFor } from '../utils/dateWeek.js';

type MemberLookup = Map<string, { firstName: string }>;

function firstNamesFor(userIds: string[], members: MemberLookup): string[] {
  return userIds.map((id) => members.get(id)?.firstName ?? '?');
}

/** Rotation order is stored as JSON (an array of turns, each turn an array of userIds) — this
 * narrows the loosely-typed Prisma JsonValue back to the shape the app actually writes. */
function asGroups(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.filter((g): g is string[] => Array.isArray(g));
}

function toConfig(slot: MealPlanSlot, members: MemberLookup): MealPlanDayConfig {
  return {
    weekday: slot.weekday,
    mode: slot.mode,
    fixedUserIds: slot.fixedUserIds,
    fixedFirstNames: firstNamesFor(slot.fixedUserIds, members),
  };
}

/** Every ROTATING weekday for the family, sorted ascending — used to give each one a stable
 * rank so consecutive turns (in calendar order, across week boundaries) advance the shared
 * rotation order by exactly one step, no matter which specific weekdays are rotating or how
 * many there are. */
function rotatingWeekdaysSorted(slotsByWeekday: Map<number, MealPlanSlot>): number[] {
  return [...slotsByWeekday.values()]
    .filter((s) => s.mode === 'ROTATING')
    .map((s) => s.weekday)
    .sort((a, b) => a - b);
}

/** Resolves who cooks on `date`, given that date's weekday config. ROTATING draws from the
 * family's one shared rotation order: each rotating weekday gets a fixed rank among that
 * week's rotating days, and the overall turn count (week index × rotating-day count + rank)
 * advances the order by one step per turn — no stored per-week state. Offsetting by the raw
 * weekday number instead of this rank would collide whenever the rotating weekdays aren't a
 * contiguous 0..N-1 set (e.g. Monday and Friday both being ROTATING would land on the same
 * person every time, since 0 and 4 share a residue mod a 4-person order). A turn can be shared
 * by several people at once — the returned array is that turn's whole group. */
function computeAssignees(
  slot: MealPlanSlot | null,
  weekday: number,
  date: Date,
  rotationGroups: string[][],
  rotatingWeekdays: number[],
): string[] {
  if (!slot) return [];
  if (slot.mode === 'FIXED') return slot.fixedUserIds;
  if (rotationGroups.length === 0 || rotatingWeekdays.length === 0) return [];
  const rank = rotatingWeekdays.indexOf(weekday);
  if (rank === -1) return [];
  const length = rotationGroups.length;
  const turnNumber = weekIndexFor(date) * rotatingWeekdays.length + rank;
  const index = ((turnNumber % length) + length) % length;
  return rotationGroups[index]!;
}

export function createMealPlanService(prisma: PrismaClient) {
  const repo = createMealPlanRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const notificationService = createNotificationService(prisma);
  const choreService = createChoreService(prisma);

  async function memberLookup(familyId: string): Promise<MemberLookup> {
    const members = await userRepo.listFamilyMembers(familyId);
    return new Map(members.map((m) => [m.id, { firstName: m.firstName }]));
  }

  async function assertFamilyMembers(familyId: string, userIds: string[]) {
    const members = await memberLookup(familyId);
    for (const id of userIds) {
      if (!members.has(id)) throw new ValidationError('Membre invalide');
    }
    return members;
  }

  async function getRotationGroups(familyId: string): Promise<string[][]> {
    const row = await repo.findRotationOrder(familyId);
    return row ? asGroups(row.orderedGroups) : [];
  }

  function baseSummaryFor(
    date: Date,
    slotsByWeekday: Map<number, MealPlanSlot>,
    rotationGroups: string[][],
    rotatingWeekdays: number[],
    members: MemberLookup,
  ): { date: string; weekday: number; assignedUserIds: string[]; assignedFirstNames: string[] } {
    const weekday = weekdayIndex(date);
    const slot = slotsByWeekday.get(weekday) ?? null;
    const assignedUserIds = computeAssignees(slot, weekday, date, rotationGroups, rotatingWeekdays);
    return {
      date: date.toISOString().slice(0, 10),
      weekday,
      assignedUserIds,
      assignedFirstNames: firstNamesFor(assignedUserIds, members),
    };
  }

  return {
    async list(familyId: string): Promise<MealPlanDayConfig[]> {
      const [slots, members] = await Promise.all([repo.listForFamily(familyId), memberLookup(familyId)]);
      return slots.map((s) => toConfig(s, members));
    },

    async getRotationOrder(familyId: string): Promise<MealPlanRotationOrderSummary> {
      const [orderedGroups, members] = await Promise.all([getRotationGroups(familyId), memberLookup(familyId)]);
      return {
        orderedGroups,
        orderedGroupFirstNames: orderedGroups.map((group) => firstNamesFor(group, members)),
      };
    },

    async setRotationOrder(params: { familyId: string; orderedGroups: string[][] }): Promise<MealPlanRotationOrderSummary> {
      const members = await assertFamilyMembers(params.familyId, params.orderedGroups.flat());
      await repo.setRotationOrder(params.familyId, params.orderedGroups);
      return {
        orderedGroups: params.orderedGroups,
        orderedGroupFirstNames: params.orderedGroups.map((group) => firstNamesFor(group, members)),
      };
    },

    /** Rolling window starting today — "each day that passes, the window shifts too". Also
     * used for the "Mois" view, which shows the next 4 weeks rather than a calendar month.
     * Overlays each date's personal done/postponed status on top of the calendar-computed
     * assignee: a postponed date's original assignees carry over as extra assignees on
     * whichever date it was pushed to, and the original date is flagged `postponedTo` so the
     * UI can show "reporté" instead of an action there. */
    async listUpcoming(familyId: string, days: number): Promise<MealPlanDaySummary[]> {
      const today = getStartOfDay(new Date());
      const rangeEnd = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const [slots, rotationGroups, members, statuses] = await Promise.all([
        repo.listForFamily(familyId),
        getRotationGroups(familyId),
        memberLookup(familyId),
        repo.listOccurrenceStatusesInRange(familyId, today, rangeEnd),
      ]);
      const slotsByWeekday = new Map(slots.map((s) => [s.weekday, s]));
      const rotatingWeekdays = rotatingWeekdaysSorted(slotsByWeekday);

      const statusByDate = new Map(statuses.map((s) => [s.date.toISOString().slice(0, 10), s]));
      const incomingByDate = new Map<string, { userIds: string[]; firstNames: string[] }>();
      for (const status of statuses) {
        if (!status.postponedToDate) continue;
        const targetKey = status.postponedToDate.toISOString().slice(0, 10);
        const originBase = baseSummaryFor(status.date, slotsByWeekday, rotationGroups, rotatingWeekdays, members);
        const bucket = incomingByDate.get(targetKey) ?? { userIds: [], firstNames: [] };
        originBase.assignedUserIds.forEach((id, i) => {
          if (!bucket.userIds.includes(id)) {
            bucket.userIds.push(id);
            bucket.firstNames.push(originBase.assignedFirstNames[i]!);
          }
        });
        incomingByDate.set(targetKey, bucket);
      }

      const result: MealPlanDaySummary[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const base = baseSummaryFor(date, slotsByWeekday, rotationGroups, rotatingWeekdays, members);
        const status = statusByDate.get(base.date);
        const incoming = incomingByDate.get(base.date);

        let assignedUserIds = base.assignedUserIds;
        let assignedFirstNames = base.assignedFirstNames;
        if (incoming) {
          incoming.userIds.forEach((id, i) => {
            if (!assignedUserIds.includes(id)) {
              assignedUserIds = [...assignedUserIds, id];
              assignedFirstNames = [...assignedFirstNames, incoming.firstNames[i]!];
            }
          });
        }

        result.push({
          ...base,
          assignedUserIds,
          assignedFirstNames,
          done: status?.done ?? false,
          postponedTo: status?.postponedToDate ? status.postponedToDate.toISOString().slice(0, 10) : null,
        });
      }
      return result;
    },

    /** A personal, self-reported checkbox on one calendar date — either mark it done, or push
     * it to another date (that date's entry gains the original assignees). Never changes who's
     * assigned; purely a display overlay on the calendar-driven rotation. */
    async setOccurrenceStatus(params: {
      familyId: string;
      date: string;
      done?: boolean;
      postponeToDate?: string | null;
    }): Promise<void> {
      const date = getStartOfDay(new Date(params.date));
      if (Number.isNaN(date.getTime())) throw new ValidationError('Date invalide');

      const data: { done?: boolean; postponedToDate?: Date | null } = {};
      if (params.done !== undefined) data.done = params.done;
      if (params.postponeToDate !== undefined) {
        if (params.postponeToDate === null) {
          data.postponedToDate = null;
        } else {
          const target = getStartOfDay(new Date(params.postponeToDate));
          if (Number.isNaN(target.getTime())) throw new ValidationError('Date de report invalide');
          data.postponedToDate = target;
        }
      }

      await repo.setOccurrenceStatus(params.familyId, date, data);
    },

    async setDay(params: {
      familyId: string;
      weekday: number;
      mode: 'FIXED' | 'ROTATING';
      fixedUserIds?: string[];
    }): Promise<MealPlanDayConfig> {
      if (params.mode === 'FIXED') {
        await assertFamilyMembers(params.familyId, params.fixedUserIds!);
      }

      const slot = await repo.upsertDay(params.familyId, params.weekday, {
        mode: params.mode,
        fixedUserIds: params.mode === 'FIXED' ? params.fixedUserIds! : [],
      });
      const members = await memberLookup(params.familyId);
      return toConfig(slot, members);
    },

    /** Hourly catch-up: notifies today's cook(s), once per family per calendar day. */
    async processDailyCookNotifications(now: Date = new Date()): Promise<number> {
      return runCookNotificationPass(getStartOfDay(now), 'TODAY', (userId) =>
        notificationService.notifyMealPlanTurn({ userId }),
      );
    },

    /** Evening-before heads-up for whoever cooks tomorrow. Gated to the evening (18:00+ UTC,
     * matching every other date computation in this module) so it reads as "get ready for
     * tomorrow" rather than firing at any random hour of today — the hourly catch-up still
     * guarantees it goes out once that window opens, even if the server was briefly down. */
    async processNextDayCookNotifications(now: Date = new Date()): Promise<number> {
      if (now.getUTCHours() < 18) return 0;
      const tomorrow = new Date(getStartOfDay(now).getTime() + 24 * 60 * 60 * 1000);
      return runCookNotificationPass(tomorrow, 'ADVANCE', (userId) =>
        notificationService.notifyMealPlanTurnTomorrow({ userId }),
      );
    },

    async getChoreConfig(familyId: string): Promise<MealPlanChoreConfigSummary> {
      const config = await repo.findChoreConfig(familyId);
      return {
        enabled: config?.enabled ?? false,
        requiresApproval: config?.requiresApproval ?? true,
        rewardType: config?.rewardType ?? 'POINTS',
        rewardCents: config?.rewardCents ?? null,
        rewardPoints: config?.rewardPoints ?? null,
      };
    },

    async setChoreConfig(params: {
      familyId: string;
      enabled: boolean;
      requiresApproval: boolean;
      rewardType: 'MONEY' | 'POINTS' | 'NONE';
      rewardCents?: number;
      rewardPoints?: number;
    }): Promise<MealPlanChoreConfigSummary> {
      const rewardCents = params.rewardType === 'MONEY' ? (params.rewardCents ?? null) : null;
      const rewardPoints = params.rewardType === 'POINTS' ? (params.rewardPoints ?? null) : null;
      await repo.setChoreConfig(params.familyId, {
        enabled: params.enabled,
        requiresApproval: params.requiresApproval,
        rewardType: params.rewardType,
        rewardCents,
        rewardPoints,
      });
      return {
        enabled: params.enabled,
        requiresApproval: params.requiresApproval,
        rewardType: params.rewardType,
        rewardCents,
        rewardPoints,
      };
    },

    /** Hourly catch-up: for every family with chore-generation enabled, gives each of today's
     * cooks a real Chore — only when they're a child, since chores are a kid-reward mechanism
     * (a shared turn with a parent still gives the child their own chore). Dedup reuses the
     * same TODAY-per-family log as the cook notification, under a distinct kind. */
    async processDailyMealPlanChores(now: Date = new Date()): Promise<number> {
      const today = getStartOfDay(now);
      const weekday = weekdayIndex(today);
      const enabledFamilies = await repo.listFamilyIdsWithChoreGenEnabled();
      let created = 0;

      for (const { familyId } of enabledFamilies) {
        const existingLog = await repo.findNotificationLog(familyId, today, 'CHORE');
        if (existingLog) continue;

        const [slots, rotationGroups, config] = await Promise.all([
          repo.listForFamily(familyId),
          getRotationGroups(familyId),
          repo.findChoreConfig(familyId),
        ]);
        if (!config?.enabled) continue;

        const slotsByWeekday = new Map(slots.map((s) => [s.weekday, s]));
        const slot = slotsByWeekday.get(weekday) ?? null;
        const userIds = computeAssignees(slot, weekday, today, rotationGroups, rotatingWeekdaysSorted(slotsByWeekday));
        if (userIds.length === 0) continue;

        let anyCreated = false;
        for (const userId of userIds) {
          const cook = await userRepo.findById(userId);
          if (!cook || cook.role !== 'CHILD') continue;

          await choreService.createChore({
            familyId,
            childUserId: userId,
            title: 'Préparer le repas du soir',
            rewardType: config.rewardType,
            rewardCents: config.rewardCents ?? undefined,
            rewardPoints: config.rewardPoints ?? undefined,
            recurrence: 'ONCE',
            requiresApproval: config.requiresApproval,
            autoGenerated: true,
          });
          anyCreated = true;
        }

        if (anyCreated) {
          await repo.createNotificationLog(familyId, today, userIds[0]!, 'CHORE');
          created += 1;
        }
      }

      return created;
    },
  };

  /** Shared by both the same-day and evening-before passes: finds `targetDate`'s cook(s) for
   * every family configured on that weekday, notifies each of them once, and logs it under
   * `kind` so the hourly check never repeats itself. */
  async function runCookNotificationPass(
    targetDate: Date,
    kind: 'TODAY' | 'ADVANCE',
    notify: (userId: string) => Promise<void>,
  ): Promise<number> {
    const weekday = weekdayIndex(targetDate);
    const families = await repo.listFamilyIdsConfiguredForWeekday(weekday);
    let notified = 0;

    for (const { familyId } of families) {
      const existingLog = await repo.findNotificationLog(familyId, targetDate, kind);
      if (existingLog) continue;

      const [slots, rotationGroups] = await Promise.all([
        repo.listForFamily(familyId),
        getRotationGroups(familyId),
      ]);
      const slotsByWeekday = new Map(slots.map((s) => [s.weekday, s]));
      const slot = slotsByWeekday.get(weekday) ?? null;
      const userIds = computeAssignees(slot, weekday, targetDate, rotationGroups, rotatingWeekdaysSorted(slotsByWeekday));
      if (userIds.length === 0) continue;

      for (const userId of userIds) {
        await notify(userId);
      }
      await repo.createNotificationLog(familyId, targetDate, userIds[0]!, kind);
      notified += 1;
    }

    return notified;
  }
}

export type MealPlanService = ReturnType<typeof createMealPlanService>;
