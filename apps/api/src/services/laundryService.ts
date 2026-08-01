import type { LaundryType, PrismaClient } from '@prisma/client';
import type { LaundryOccurrenceSummary, LaundryTypeSummary } from '@banque-familiale/shared';
import { createLaundryRepository } from '../repositories/laundryRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createNotificationService } from './notificationService.js';
import { createChoreService } from './choreService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { getStartOfDay, weekdayIndex, weekIndexFor } from '../utils/dateWeek.js';

type MemberLookup = Map<string, { firstName: string }>;

function firstNamesFor(userIds: string[], members: MemberLookup): string[] {
  return userIds.map((id) => members.get(id)?.firstName ?? '?');
}

/** Rotation groups are stored as JSON (an array of turns, each turn an array of userIds) —
 * this narrows the loosely-typed Prisma JsonValue back to the shape the app actually writes. */
function asGroups(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.filter((g): g is string[] => Array.isArray(g));
}

/** Who's due for this type on `date`. FIXED always resolves to `fixedUserIds`. ROTATING draws
 * from this type's own rotation groups: ONCE only ever has one occurrence so it's always the
 * first turn in the order; WEEKLY advances by one step per calendar week (same weekIndexFor
 * math as meal plan); MULTIPLE gives each of its weekdays a stable rank so several weekdays
 * sharing one order don't all land on the same turn the way a raw weekday-number offset would
 * collide whenever the weekdays aren't a contiguous 0..N-1 set. A turn can be shared by several
 * people at once — the returned array is that turn's whole group. */
function computeAssignees(type: LaundryType, date: Date): string[] {
  if (type.mode === 'FIXED') return type.fixedUserIds;
  const groups = asGroups(type.rotationGroups);
  if (groups.length === 0) return [];

  let turnNumber: number;
  if (type.scheduleType === 'ONCE') {
    turnNumber = 0;
  } else if (type.scheduleType === 'WEEKLY') {
    turnNumber = weekIndexFor(date);
  } else {
    const sortedWeekdays = [...type.weekdays].sort((a, b) => a - b);
    const rank = sortedWeekdays.indexOf(weekdayIndex(date));
    if (rank === -1) return [];
    turnNumber = weekIndexFor(date) * sortedWeekdays.length + rank;
  }
  const index = ((turnNumber % groups.length) + groups.length) % groups.length;
  return groups[index]!;
}

function choreFieldsFor(params: {
  generatesChore?: boolean;
  choreRequiresApproval?: boolean;
  choreRewardType?: 'MONEY' | 'POINTS' | 'NONE';
  choreRewardCents?: number;
  choreRewardPoints?: number;
}) {
  const generatesChore = params.generatesChore ?? false;
  return {
    generatesChore,
    choreRequiresApproval: params.choreRequiresApproval ?? true,
    choreRewardType: generatesChore ? (params.choreRewardType ?? null) : null,
    choreRewardCents: generatesChore && params.choreRewardType === 'MONEY' ? (params.choreRewardCents ?? null) : null,
    choreRewardPoints: generatesChore && params.choreRewardType === 'POINTS' ? (params.choreRewardPoints ?? null) : null,
  };
}

function isDueOn(type: LaundryType, date: Date, weekday: number): boolean {
  if (type.scheduleType === 'ONCE') {
    return type.onceDate !== null && getStartOfDay(type.onceDate).getTime() === date.getTime();
  }
  return type.weekdays.includes(weekday);
}

function toSummary(type: LaundryType, members: MemberLookup): LaundryTypeSummary {
  const rotationGroups = asGroups(type.rotationGroups);
  return {
    id: type.id,
    name: type.name,
    order: type.order,
    mode: type.mode,
    fixedUserIds: type.fixedUserIds,
    fixedFirstNames: firstNamesFor(type.fixedUserIds, members),
    rotationGroups,
    rotationGroupFirstNames: rotationGroups.map((group) => firstNamesFor(group, members)),
    scheduleType: type.scheduleType,
    weekdays: type.weekdays,
    onceDate: type.onceDate ? type.onceDate.toISOString().slice(0, 10) : null,
    generatesChore: type.generatesChore,
    choreRequiresApproval: type.choreRequiresApproval,
    choreRewardType: type.choreRewardType,
    choreRewardCents: type.choreRewardCents,
    choreRewardPoints: type.choreRewardPoints,
  };
}

export function createLaundryService(prisma: PrismaClient) {
  const repo = createLaundryRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const notificationService = createNotificationService(prisma);
  const choreService = createChoreService(prisma);

  async function memberLookup(familyId: string): Promise<MemberLookup> {
    const members = await userRepo.listFamilyMembers(familyId);
    return new Map(members.map((m) => [m.id, { firstName: m.firstName }]));
  }

  async function assertFamilyMembers(familyId: string, userIds: string[], members: MemberLookup) {
    for (const id of userIds) {
      if (!members.has(id)) throw new ValidationError('Membre invalide');
    }
  }

  async function assertOwnedByFamily(id: string, familyId: string): Promise<LaundryType> {
    const type = await repo.findById(id);
    if (!type || type.familyId !== familyId) throw new NotFoundError('Type de lessive introuvable');
    return type;
  }

  return {
    async list(familyId: string): Promise<LaundryTypeSummary[]> {
      const [types, members] = await Promise.all([repo.listForFamily(familyId), memberLookup(familyId)]);
      return types.map((t) => toSummary(t, members));
    },

    /** Rolling window starting today, mirroring meal plan's listUpcoming — every (type, date)
     * pair due within the window, resolved to who's on it. Overlays each occurrence's personal
     * done/postponed status: a postponed occurrence's original assignees carry over to
     * whichever date it was pushed to (merged into that date's occurrence for the same type if
     * one already exists there, otherwise added as its own occurrence), and the original
     * occurrence is flagged `postponedTo`. */
    async listUpcoming(familyId: string, days: number): Promise<LaundryOccurrenceSummary[]> {
      const today = getStartOfDay(new Date());
      const rangeEnd = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const [types, members, statuses] = await Promise.all([
        repo.listForFamily(familyId),
        memberLookup(familyId),
        repo.listOccurrenceStatusesInRange(familyId, today, rangeEnd),
      ]);
      const typesById = new Map(types.map((t) => [t.id, t]));

      const statusByKey = new Map(statuses.map((s) => [`${s.laundryTypeId}|${s.date.toISOString().slice(0, 10)}`, s]));
      const incomingByKey = new Map<string, { userIds: string[]; firstNames: string[] }>();
      for (const status of statuses) {
        if (!status.postponedToDate) continue;
        const type = typesById.get(status.laundryTypeId);
        if (!type) continue;
        const originAssignees = computeAssignees(type, status.date);
        const targetKey = `${status.laundryTypeId}|${status.postponedToDate.toISOString().slice(0, 10)}`;
        const bucket = incomingByKey.get(targetKey) ?? { userIds: [], firstNames: [] };
        originAssignees.forEach((id) => {
          if (!bucket.userIds.includes(id)) {
            bucket.userIds.push(id);
            bucket.firstNames.push(members.get(id)?.firstName ?? '?');
          }
        });
        incomingByKey.set(targetKey, bucket);
      }
      const mergedKeys = new Set<string>();

      const result: LaundryOccurrenceSummary[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().slice(0, 10);
        const weekday = weekdayIndex(date);
        for (const type of types) {
          if (!isDueOn(type, date, weekday)) continue;
          const key = `${type.id}|${dateKey}`;
          const status = statusByKey.get(key);
          const incoming = incomingByKey.get(key);

          let assignedUserIds = computeAssignees(type, date);
          let assignedFirstNames = firstNamesFor(assignedUserIds, members);
          if (incoming) {
            mergedKeys.add(key);
            incoming.userIds.forEach((id, idx) => {
              if (!assignedUserIds.includes(id)) {
                assignedUserIds = [...assignedUserIds, id];
                assignedFirstNames = [...assignedFirstNames, incoming.firstNames[idx]!];
              }
            });
          }

          result.push({
            date: dateKey,
            weekday,
            laundryTypeId: type.id,
            laundryTypeName: type.name,
            assignedUserIds,
            assignedFirstNames,
            done: status?.done ?? false,
            postponedTo: status?.postponedToDate ? status.postponedToDate.toISOString().slice(0, 10) : null,
          });
        }
      }

      // Occurrences postponed into a (type, date) pair that wasn't already naturally due —
      // e.g. postponing a Wednesday-only type to Thursday — get their own synthetic entry.
      for (const [key, incoming] of incomingByKey) {
        if (mergedKeys.has(key)) continue;
        const [laundryTypeId, dateKey] = key.split('|') as [string, string];
        const type = typesById.get(laundryTypeId);
        if (!type) continue;
        const date = new Date(`${dateKey}T00:00:00.000Z`);
        if (date.getTime() < today.getTime() || date.getTime() >= rangeEnd.getTime()) continue;
        result.push({
          date: dateKey,
          weekday: weekdayIndex(date),
          laundryTypeId: type.id,
          laundryTypeName: type.name,
          assignedUserIds: incoming.userIds,
          assignedFirstNames: incoming.firstNames,
          done: false,
          postponedTo: null,
        });
      }

      result.sort((a, b) => a.date.localeCompare(b.date));
      return result;
    },

    /** A personal, self-reported checkbox on one (type, date) occurrence — either mark it
     * done, or push it to another date (that date's occurrence gains the original assignees).
     * Never changes who's actually due next; purely a display overlay. */
    async setOccurrenceStatus(params: {
      familyId: string;
      laundryTypeId: string;
      date: string;
      done?: boolean;
      postponeToDate?: string | null;
    }): Promise<void> {
      await assertOwnedByFamily(params.laundryTypeId, params.familyId);
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

      await repo.setOccurrenceStatus(params.familyId, params.laundryTypeId, date, data);
    },

    async create(params: {
      familyId: string;
      name: string;
      mode: 'FIXED' | 'ROTATING';
      fixedUserIds?: string[];
      rotationGroups?: string[][];
      scheduleType: 'ONCE' | 'WEEKLY' | 'MULTIPLE';
      weekdays?: number[];
      onceDate?: string;
      generatesChore?: boolean;
      choreRequiresApproval?: boolean;
      choreRewardType?: 'MONEY' | 'POINTS' | 'NONE';
      choreRewardCents?: number;
      choreRewardPoints?: number;
    }): Promise<LaundryTypeSummary> {
      const members = await memberLookup(params.familyId);
      if (params.mode === 'FIXED') {
        await assertFamilyMembers(params.familyId, params.fixedUserIds ?? [], members);
      } else {
        await assertFamilyMembers(params.familyId, (params.rotationGroups ?? []).flat(), members);
      }
      const created = await repo.create({
        familyId: params.familyId,
        name: params.name,
        mode: params.mode,
        fixedUserIds: params.mode === 'FIXED' ? (params.fixedUserIds ?? []) : [],
        rotationGroups: params.mode === 'ROTATING' ? (params.rotationGroups ?? []) : [],
        scheduleType: params.scheduleType,
        weekdays: params.scheduleType === 'ONCE' ? [] : (params.weekdays ?? []),
        onceDate: params.scheduleType === 'ONCE' ? new Date(params.onceDate!) : null,
        ...choreFieldsFor(params),
      });
      return toSummary(created, members);
    },

    async update(params: {
      id: string;
      familyId: string;
      name: string;
      mode: 'FIXED' | 'ROTATING';
      fixedUserIds?: string[];
      rotationGroups?: string[][];
      scheduleType: 'ONCE' | 'WEEKLY' | 'MULTIPLE';
      weekdays?: number[];
      onceDate?: string;
      generatesChore?: boolean;
      choreRequiresApproval?: boolean;
      choreRewardType?: 'MONEY' | 'POINTS' | 'NONE';
      choreRewardCents?: number;
      choreRewardPoints?: number;
    }): Promise<LaundryTypeSummary> {
      await assertOwnedByFamily(params.id, params.familyId);
      const members = await memberLookup(params.familyId);
      if (params.mode === 'FIXED') {
        await assertFamilyMembers(params.familyId, params.fixedUserIds ?? [], members);
      } else {
        await assertFamilyMembers(params.familyId, (params.rotationGroups ?? []).flat(), members);
      }
      const updated = await repo.update(params.id, {
        name: params.name,
        mode: params.mode,
        fixedUserIds: params.mode === 'FIXED' ? (params.fixedUserIds ?? []) : [],
        rotationGroups: params.mode === 'ROTATING' ? (params.rotationGroups ?? []) : [],
        scheduleType: params.scheduleType,
        weekdays: params.scheduleType === 'ONCE' ? [] : (params.weekdays ?? []),
        onceDate: params.scheduleType === 'ONCE' ? new Date(params.onceDate!) : null,
        ...choreFieldsFor(params),
      });
      return toSummary(updated, members);
    },

    async remove(params: { id: string; familyId: string }): Promise<void> {
      await assertOwnedByFamily(params.id, params.familyId);
      await repo.delete(params.id);
    },

    async reorder(params: { familyId: string; orderedIds: string[] }): Promise<void> {
      const types = await repo.listForFamily(params.familyId);
      const validIds = new Set(types.map((t) => t.id));
      for (const id of params.orderedIds) {
        if (!validIds.has(id)) throw new ValidationError('Type de lessive invalide');
      }
      await repo.reorder(params.familyId, params.orderedIds);
    },

    /** Hourly catch-up: notifies whoever's due today, once per type per calendar day. */
    async processDailyLaundryNotifications(now: Date = new Date()): Promise<number> {
      return runLaundryNotificationPass(getStartOfDay(now), 'TODAY', (userId, laundryTypeName) =>
        notificationService.notifyLaundryTurn({ userId, laundryTypeName }),
      );
    },

    /** Evening-before heads-up, gated to 18:00+ UTC — same convention as meal plan's advance
     * notice. */
    async processNextDayLaundryNotifications(now: Date = new Date()): Promise<number> {
      if (now.getUTCHours() < 18) return 0;
      const tomorrow = new Date(getStartOfDay(now).getTime() + 24 * 60 * 60 * 1000);
      return runLaundryNotificationPass(tomorrow, 'ADVANCE', (userId, laundryTypeName) =>
        notificationService.notifyLaundryTurnTomorrow({ userId, laundryTypeName }),
      );
    },

    /** Hourly catch-up: for every type with chore-generation enabled that's due today, gives
     * each assigned person a real Chore — only when they're a child (a shared turn with a
     * parent still gives the child their own chore). Dedup reuses the same per-type log as the
     * notifications, under a distinct kind. */
    async processDailyLaundryChores(now: Date = new Date()): Promise<number> {
      const today = getStartOfDay(now);
      const weekday = weekdayIndex(today);
      const dueTypes = await repo.listDueForDate(today, weekday);
      let created = 0;

      for (const type of dueTypes) {
        if (!type.generatesChore) continue;

        const existingLog = await repo.findNotificationLog(type.id, today, 'CHORE');
        if (existingLog) continue;

        const userIds = computeAssignees(type, today);
        if (userIds.length === 0) continue;

        let anyCreated = false;
        for (const userId of userIds) {
          const assignee = await userRepo.findById(userId);
          if (!assignee || assignee.role !== 'CHILD') continue;

          await choreService.createChore({
            familyId: type.familyId,
            childUserId: userId,
            title: `Lessive : ${type.name}`,
            rewardType: type.choreRewardType ?? 'POINTS',
            rewardCents: type.choreRewardCents ?? undefined,
            rewardPoints: type.choreRewardPoints ?? undefined,
            recurrence: 'ONCE',
            requiresApproval: type.choreRequiresApproval,
          });
          anyCreated = true;
        }

        if (anyCreated) {
          await repo.createNotificationLog(type.familyId, type.id, today, userIds[0]!, 'CHORE');
          created += 1;
        }
      }

      return created;
    },
  };

  /** Shared by both passes: finds every type due on `targetDate` (across every family),
   * notifies everyone assigned once, and logs it under `kind` so the hourly check never
   * repeats itself. Scoped per type (not per family) since several types can be due the same
   * date. */
  async function runLaundryNotificationPass(
    targetDate: Date,
    kind: 'TODAY' | 'ADVANCE',
    notify: (userId: string, laundryTypeName: string) => Promise<void>,
  ): Promise<number> {
    const weekday = weekdayIndex(targetDate);
    const dueTypes = await repo.listDueForDate(targetDate, weekday);
    let notified = 0;

    for (const type of dueTypes) {
      const existingLog = await repo.findNotificationLog(type.id, targetDate, kind);
      if (existingLog) continue;

      const userIds = computeAssignees(type, targetDate);
      if (userIds.length === 0) continue;

      for (const userId of userIds) {
        await notify(userId, type.name);
      }
      await repo.createNotificationLog(type.familyId, type.id, targetDate, userIds[0]!, kind);
      notified += 1;
    }

    return notified;
  }
}

export type LaundryService = ReturnType<typeof createLaundryService>;
