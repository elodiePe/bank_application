import type { MealPlanSlot, PrismaClient, User } from '@prisma/client';
import type { MealPlanDayConfig, MealPlanDaySummary, MealPlanRotationOrderSummary } from '@banque-familiale/shared';
import { createMealPlanRepository } from '../repositories/mealPlanRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createNotificationService } from './notificationService.js';
import { ValidationError } from '../utils/errors.js';
import { getStartOfDay, weekdayIndex, weekIndexFor } from '../utils/dateWeek.js';

type SlotWithFixedUser = MealPlanSlot & { fixedUser: User | null };
type MemberLookup = Map<string, { firstName: string }>;

function toConfig(slot: SlotWithFixedUser): MealPlanDayConfig {
  return {
    weekday: slot.weekday,
    mode: slot.mode,
    fixedUserId: slot.fixedUserId,
    fixedFirstName: slot.fixedUser?.firstName ?? null,
  };
}

/** Every ROTATING weekday for the family, sorted ascending — used to give each one a stable
 * rank so consecutive turns (in calendar order, across week boundaries) advance the shared
 * rotation order by exactly one step, no matter which specific weekdays are rotating or how
 * many there are. */
function rotatingWeekdaysSorted(slotsByWeekday: Map<number, SlotWithFixedUser>): number[] {
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
 * person every time, since 0 and 4 share a residue mod a 4-person order). */
function computeAssignee(
  slot: SlotWithFixedUser | null,
  weekday: number,
  date: Date,
  rotationOrder: string[],
  rotatingWeekdays: number[],
): string | null {
  if (!slot) return null;
  if (slot.mode === 'FIXED') return slot.fixedUserId;
  if (rotationOrder.length === 0 || rotatingWeekdays.length === 0) return null;
  const rank = rotatingWeekdays.indexOf(weekday);
  if (rank === -1) return null;
  const length = rotationOrder.length;
  const turnNumber = weekIndexFor(date) * rotatingWeekdays.length + rank;
  const index = ((turnNumber % length) + length) % length;
  return rotationOrder[index]!;
}

export function createMealPlanService(prisma: PrismaClient) {
  const repo = createMealPlanRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const notificationService = createNotificationService(prisma);

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

  async function getRotationOrderIds(familyId: string): Promise<string[]> {
    const row = await repo.findRotationOrder(familyId);
    return row?.orderedUserIds ?? [];
  }

  function summaryFor(
    date: Date,
    slotsByWeekday: Map<number, SlotWithFixedUser>,
    rotationOrder: string[],
    rotatingWeekdays: number[],
    members: MemberLookup,
  ): MealPlanDaySummary {
    const weekday = weekdayIndex(date);
    const slot = slotsByWeekday.get(weekday) ?? null;
    const assignedUserId = computeAssignee(slot, weekday, date, rotationOrder, rotatingWeekdays);
    return {
      date: date.toISOString().slice(0, 10),
      weekday,
      assignedUserId,
      assignedFirstName: assignedUserId ? (members.get(assignedUserId)?.firstName ?? null) : null,
    };
  }

  return {
    async list(familyId: string): Promise<MealPlanDayConfig[]> {
      const slots = await repo.listForFamily(familyId);
      return slots.map(toConfig);
    },

    async getRotationOrder(familyId: string): Promise<MealPlanRotationOrderSummary> {
      const [orderedUserIds, members] = await Promise.all([getRotationOrderIds(familyId), memberLookup(familyId)]);
      return {
        orderedUserIds,
        orderedFirstNames: orderedUserIds.map((id) => members.get(id)?.firstName ?? '?'),
      };
    },

    async setRotationOrder(params: { familyId: string; orderedUserIds: string[] }): Promise<MealPlanRotationOrderSummary> {
      const members = await assertFamilyMembers(params.familyId, params.orderedUserIds);
      await repo.setRotationOrder(params.familyId, params.orderedUserIds);
      return {
        orderedUserIds: params.orderedUserIds,
        orderedFirstNames: params.orderedUserIds.map((id) => members.get(id)?.firstName ?? '?'),
      };
    },

    /** Rolling window starting today — "each day that passes, the window shifts too". Also
     * used for the "Mois" view, which shows the next 4 weeks rather than a calendar month. */
    async listUpcoming(familyId: string, days: number): Promise<MealPlanDaySummary[]> {
      const [slots, rotationOrder, members] = await Promise.all([
        repo.listForFamily(familyId),
        getRotationOrderIds(familyId),
        memberLookup(familyId),
      ]);
      const slotsByWeekday = new Map(slots.map((s) => [s.weekday, s]));
      const rotatingWeekdays = rotatingWeekdaysSorted(slotsByWeekday);
      const today = getStartOfDay(new Date());

      const result: MealPlanDaySummary[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        result.push(summaryFor(date, slotsByWeekday, rotationOrder, rotatingWeekdays, members));
      }
      return result;
    },

    async setDay(params: {
      familyId: string;
      weekday: number;
      mode: 'FIXED' | 'ROTATING';
      fixedUserId?: string;
    }): Promise<MealPlanDayConfig> {
      if (params.mode === 'FIXED') {
        await assertFamilyMembers(params.familyId, [params.fixedUserId!]);
      }

      const slot = await repo.upsertDay(params.familyId, params.weekday, {
        mode: params.mode,
        fixedUserId: params.mode === 'FIXED' ? params.fixedUserId! : null,
      });
      return toConfig(slot);
    },

    /** Hourly catch-up: notifies today's cook, once per family per calendar day. */
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
  };

  /** Shared by both the same-day and evening-before passes: finds `targetDate`'s cook for
   * every family configured on that weekday, notifies them once, and logs it under `kind` so
   * the hourly check never repeats itself. */
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

      const [slots, rotationOrder] = await Promise.all([
        repo.listForFamily(familyId),
        getRotationOrderIds(familyId),
      ]);
      const slotsByWeekday = new Map(slots.map((s) => [s.weekday, s]));
      const slot = slotsByWeekday.get(weekday) ?? null;
      const userId = computeAssignee(slot, weekday, targetDate, rotationOrder, rotatingWeekdaysSorted(slotsByWeekday));
      if (!userId) continue;

      await notify(userId);
      await repo.createNotificationLog(familyId, targetDate, userId, kind);
      notified += 1;
    }

    return notified;
  }
}

export type MealPlanService = ReturnType<typeof createMealPlanService>;
