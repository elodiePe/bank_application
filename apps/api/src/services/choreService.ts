import type { Chore, ChoreCompletion, PrismaClient, User } from '@prisma/client';
import type { ChoreCompletionSummary, ChoreSummary } from '@banque-familiale/shared';
import { createChoreRepository } from '../repositories/choreRepository.js';
import { createChoreCompletionRepository } from '../repositories/choreCompletionRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createMoneyService } from './moneyService.js';
import { createNotificationService } from './notificationService.js';
import { ConflictError, ForbiddenError, InvalidRequestStateError, NotFoundError, ValidationError } from '../utils/errors.js';
import { getMondayOfWeek } from '../utils/dateWeek.js';

type ChoreWithChild = Chore & { childUser: User };
type CompletionWithRelations = ChoreCompletion & { chore: ChoreWithChild; respondedBy: User | null };

/** Midnight UTC of the day containing `date` — the DAILY equivalent of getMondayOfWeek. */
function getStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function periodStartFor(chore: { recurrence: string; createdAt: Date }, now: Date): Date {
  if (chore.recurrence === 'WEEKLY') return getMondayOfWeek(now);
  if (chore.recurrence === 'DAILY') return getStartOfDay(now);
  // ONCE: a single period for the chore's whole lifetime, anchored to its creation day.
  return getStartOfDay(chore.createdAt);
}

// How long into its current period a chore must sit undone before the child gets nudged, and
// how long a pending completion must sit unactioned before the parents get nudged.
const REMINDER_THRESHOLD_HOURS: Record<string, number> = { DAILY: 12, WEEKLY: 72, ONCE: 24 };
const APPROVAL_REMINDER_THRESHOLD_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

function toChoreSummary(chore: ChoreWithChild, currentCompletion: ChoreCompletion | null): ChoreSummary {
  return {
    id: chore.id,
    childUserId: chore.childUserId,
    childFirstName: chore.childUser.firstName,
    title: chore.title,
    rewardType: chore.rewardType,
    rewardCents: chore.rewardCents,
    rewardPoints: chore.rewardPoints,
    recurrence: chore.recurrence,
    requiresApproval: chore.requiresApproval,
    active: chore.active,
    currentPeriodStatus: currentCompletion?.status ?? null,
    createdAt: chore.createdAt.toISOString(),
  };
}

function toCompletionSummary(completion: CompletionWithRelations): ChoreCompletionSummary {
  return {
    id: completion.id,
    choreId: completion.choreId,
    choreTitle: completion.chore.title,
    childUserId: completion.chore.childUserId,
    childFirstName: completion.chore.childUser.firstName,
    periodStart: completion.periodStart.toISOString(),
    status: completion.status,
    rewardType: completion.rewardType,
    rewardCents: completion.rewardCents,
    rewardPoints: completion.rewardPoints,
    respondedByFirstName: completion.respondedBy?.firstName ?? null,
    respondedAt: completion.respondedAt?.toISOString() ?? null,
    createdAt: completion.createdAt.toISOString(),
  };
}

export function createChoreService(prisma: PrismaClient) {
  const choreRepo = createChoreRepository(prisma);
  const completionRepo = createChoreCompletionRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const childAccountRepo = createChildAccountRepository(prisma);
  const moneyService = createMoneyService(prisma);
  const notificationService = createNotificationService(prisma);

  async function assertChoreInFamily(choreId: string, familyId: string) {
    const chore = await choreRepo.findByIdOrThrow(choreId);
    if (chore.familyId !== familyId) throw new NotFoundError('Tâche introuvable');
    return chore;
  }

  return {
    async listFamilyChores(familyId: string): Promise<ChoreSummary[]> {
      const chores = await choreRepo.listForFamily(familyId);
      const now = new Date();
      return Promise.all(
        chores.map(async (chore) => {
          const period = periodStartFor(chore, now);
          const completion = await completionRepo.findLatestForPeriod(chore.id, period);
          return toChoreSummary(chore, completion);
        }),
      );
    },

    async listMyChores(childUserId: string): Promise<ChoreSummary[]> {
      const now = new Date();
      const chores = await choreRepo.listActiveForChild(childUserId, now);
      return Promise.all(
        chores.map(async (chore) => {
          const period = periodStartFor(chore, now);
          const completion = await completionRepo.findLatestForPeriod(chore.id, period);
          return toChoreSummary(chore, completion);
        }),
      );
    },

    async createChore(params: {
      familyId: string;
      childUserId: string;
      title: string;
      rewardType: 'MONEY' | 'POINTS' | 'NONE';
      rewardCents?: number;
      rewardPoints?: number;
      recurrence: 'ONCE' | 'DAILY' | 'WEEKLY';
      requiresApproval?: boolean;
      /** True only for the meal-plan/laundry daily placeholder chores — see schema comment on
       * Chore.autoGenerated. Never set by a parent creating a real chore. */
      autoGenerated?: boolean;
    }): Promise<ChoreSummary> {
      const target = await userRepo.findById(params.childUserId);
      if (
        !target ||
        target.familyId !== params.familyId ||
        target.role !== 'CHILD' ||
        target.deactivatedAt !== null
      ) {
        throw new ValidationError('Enfant invalide');
      }

      const chore = await choreRepo.create({
        familyId: params.familyId,
        childUser: { connect: { id: params.childUserId } },
        title: params.title,
        rewardType: params.rewardType,
        rewardCents: params.rewardType === 'MONEY' ? params.rewardCents : null,
        rewardPoints: params.rewardType === 'POINTS' ? params.rewardPoints : null,
        recurrence: params.recurrence,
        requiresApproval: params.requiresApproval ?? true,
        autoGenerated: params.autoGenerated ?? false,
      });
      return toChoreSummary(chore, null);
    },

    async updateChore(params: {
      familyId: string;
      choreId: string;
      title?: string;
      rewardType?: 'MONEY' | 'POINTS' | 'NONE';
      rewardCents?: number;
      rewardPoints?: number;
      active?: boolean;
      requiresApproval?: boolean;
    }): Promise<ChoreSummary> {
      const chore = await assertChoreInFamily(params.choreId, params.familyId);
      const rewardType = params.rewardType ?? chore.rewardType;
      const updated = await choreRepo.update(chore.id, {
        title: params.title,
        rewardType: params.rewardType,
        // Whenever the reward type is (re)confirmed, clear the field that no longer applies
        // — a chore can never end up with both a cents and a points value set at once.
        rewardCents: params.rewardType ? (rewardType === 'MONEY' ? (params.rewardCents ?? chore.rewardCents) : null) : params.rewardCents,
        rewardPoints: params.rewardType ? (rewardType === 'POINTS' ? (params.rewardPoints ?? chore.rewardPoints) : null) : params.rewardPoints,
        active: params.active,
        requiresApproval: params.requiresApproval,
      });
      const now = new Date();
      const completion = await completionRepo.findLatestForPeriod(updated.id, periodStartFor(updated, now));
      return toChoreSummary(updated, completion);
    },

    async deleteChore(params: { familyId: string; choreId: string }): Promise<void> {
      await assertChoreInFamily(params.choreId, params.familyId);
      await choreRepo.delete(params.choreId);
    },

    /** "Reporter à demain": deactivates today's still-undone chore (no reward, nothing
     * recorded) and creates a fresh clone that only becomes visible/reminded once tomorrow
     * arrives. DAILY chores already reset every day on their own, so postponing one wouldn't
     * mean anything. Callable by the chore's own child, or any parent on the child's behalf. */
    async postponeChore(params: {
      familyId: string;
      choreId: string;
      actorId: string;
      actorRole: 'PARENT' | 'CHILD';
    }): Promise<ChoreSummary> {
      const chore = await assertChoreInFamily(params.choreId, params.familyId);
      if (params.actorRole === 'CHILD' && chore.childUserId !== params.actorId) {
        throw new ForbiddenError("Cette tâche n'est pas la tienne");
      }
      if (chore.recurrence === 'DAILY') {
        throw new ValidationError('Une tâche quotidienne revient déjà toute seule, inutile de la reporter');
      }

      const now = new Date();
      const tomorrow = new Date(getStartOfDay(now).getTime() + 24 * 60 * 60 * 1000);

      await choreRepo.update(chore.id, { active: false });
      const clone = await choreRepo.create({
        familyId: chore.familyId,
        childUser: { connect: { id: chore.childUserId } },
        title: chore.title,
        rewardType: chore.rewardType,
        rewardCents: chore.rewardCents,
        rewardPoints: chore.rewardPoints,
        recurrence: chore.recurrence,
        requiresApproval: chore.requiresApproval,
        startsOn: tomorrow,
      });
      return toChoreSummary(clone, null);
    },

    /** A child marks one of their own active chores as done for the current period. */
    async completeChore(params: { familyId: string; childUserId: string; choreId: string }): Promise<ChoreCompletionSummary> {
      const chore = await assertChoreInFamily(params.choreId, params.familyId);
      if (chore.childUserId !== params.childUserId) {
        throw new ForbiddenError("Cette tâche n'est pas la tienne");
      }
      if (!chore.active) {
        throw new ValidationError("Cette tâche n'est plus active");
      }

      const now = new Date();
      const period = periodStartFor(chore, now);
      const existing = await completionRepo.findActiveForPeriod(chore.id, period);
      if (existing) {
        throw new ConflictError('Déjà envoyé pour cette période');
      }

      // Chores set up without approval reward themselves the moment the child taps "Fait !" —
      // no PENDING state, no parent action, same reward-application logic as approveCompletion.
      if (!chore.requiresApproval) {
        const account = await childAccountRepo.findByUserId(chore.childUserId);
        if (!account) throw new NotFoundError('Compte introuvable');

        let transactionId: string | undefined;
        if (chore.rewardType === 'MONEY') {
          const transaction = await moneyService.deposit({
            accountId: account.id,
            familyId: params.familyId,
            amountCents: chore.rewardCents!,
            comment: `Tâche : ${chore.title}`,
            validatedById: params.childUserId,
            type: 'CHORE_REWARD',
          });
          transactionId = transaction.id;
        } else if (chore.rewardType === 'POINTS') {
          await childAccountRepo.incrementPoints(account.id, chore.rewardPoints!);
        }

        const created = await completionRepo.create({
          chore: { connect: { id: chore.id } },
          periodStart: period,
          status: 'APPROVED',
          rewardType: chore.rewardType,
          rewardCents: chore.rewardCents,
          rewardPoints: chore.rewardPoints,
          respondedBy: { connect: { id: params.childUserId } },
          respondedAt: now,
          ...(transactionId ? { transactionId } : {}),
        });

        if (chore.recurrence === 'ONCE') {
          await choreRepo.update(chore.id, { active: false });
        }

        return toCompletionSummary(created);
      }

      const created = await completionRepo.create({
        chore: { connect: { id: chore.id } },
        periodStart: period,
        status: 'PENDING',
        rewardType: chore.rewardType,
        rewardCents: chore.rewardCents,
        rewardPoints: chore.rewardPoints,
      });

      await notificationService.notifyParentsOfChoreCompletion({
        familyId: params.familyId,
        childFirstName: chore.childUser.firstName,
        choreTitle: chore.title,
        choreCompletionId: created.id,
      });

      return toCompletionSummary(created);
    },

    async listPendingCompletions(familyId: string): Promise<ChoreCompletionSummary[]> {
      const completions = await completionRepo.listPendingForFamily(familyId);
      return completions.map(toCompletionSummary);
    },

    async approveCompletion(params: {
      familyId: string;
      actorId: string;
      completionId: string;
    }): Promise<ChoreCompletionSummary> {
      const completion = await completionRepo.findByIdOrThrow(params.completionId);
      if (completion.chore.familyId !== params.familyId) throw new NotFoundError('Tâche introuvable');
      if (completion.status !== 'PENDING') throw new InvalidRequestStateError();

      const account = await childAccountRepo.findByUserId(completion.chore.childUserId);
      if (!account) throw new NotFoundError('Compte introuvable');

      let transactionId: string | undefined;
      if (completion.rewardType === 'MONEY') {
        const transaction = await moneyService.deposit({
          accountId: account.id,
          familyId: params.familyId,
          amountCents: completion.rewardCents!,
          comment: `Tâche : ${completion.chore.title}`,
          validatedById: params.actorId,
          type: 'CHORE_REWARD',
        });
        transactionId = transaction.id;
      } else if (completion.rewardType === 'POINTS') {
        // Points never touch the money ledger — just a cosmetic score on the account.
        await childAccountRepo.incrementPoints(account.id, completion.rewardPoints!);
      }

      const updated = await completionRepo.updateStatus(completion.id, {
        status: 'APPROVED',
        respondedById: params.actorId,
        transactionId,
      });

      if (completion.chore.recurrence === 'ONCE') {
        await choreRepo.update(completion.chore.id, { active: false });
      }

      const actor = await userRepo.findById(params.actorId);
      await notificationService.notifyChoreApproved({
        childUserId: completion.chore.childUserId,
        choreTitle: completion.chore.title,
        rewardType: completion.rewardType,
        rewardCents: completion.rewardCents,
        rewardPoints: completion.rewardPoints,
        approvedByFirstName: actor?.firstName ?? '',
        choreCompletionId: completion.id,
      });

      return toCompletionSummary(updated);
    },

    async rejectCompletion(params: {
      familyId: string;
      actorId: string;
      completionId: string;
    }): Promise<ChoreCompletionSummary> {
      const completion = await completionRepo.findByIdOrThrow(params.completionId);
      if (completion.chore.familyId !== params.familyId) throw new NotFoundError('Tâche introuvable');
      if (completion.status !== 'PENDING') throw new InvalidRequestStateError();

      const updated = await completionRepo.updateStatus(completion.id, {
        status: 'REJECTED',
        respondedById: params.actorId,
      });

      const actor = await userRepo.findById(params.actorId);
      await notificationService.notifyChoreRejected({
        childUserId: completion.chore.childUserId,
        choreTitle: completion.chore.title,
        rejectedByFirstName: actor?.firstName ?? '',
        choreCompletionId: completion.id,
      });

      return toCompletionSummary(updated);
    },

    /** Hourly catch-up: nudges a child about a chore still undone well into its current
     * period, and nudges the parents about a completion that's sat pending too long. Returns
     * how many of each reminder were sent, for the caller to log. */
    async processReminders(now: Date = new Date()): Promise<{ choreReminders: number; approvalReminders: number }> {
      let choreReminders = 0;
      const activeChores = await choreRepo.listAllActive(now);
      for (const chore of activeChores) {
        const period = periodStartFor(chore, now);
        if (chore.lastReminderSentAt && chore.lastReminderSentAt >= period) continue;

        const thresholdHours = REMINDER_THRESHOLD_HOURS[chore.recurrence] ?? 24;
        const hoursSincePeriodStart = (now.getTime() - period.getTime()) / HOUR_MS;
        if (hoursSincePeriodStart < thresholdHours) continue;

        const existing = await completionRepo.findActiveForPeriod(chore.id, period);
        if (existing) continue;

        await notificationService.notifyChoreReminder({
          childUserId: chore.childUserId,
          choreTitle: chore.title,
          choreId: chore.id,
        });
        await choreRepo.markReminderSent(chore.id, now);
        choreReminders += 1;
      }

      let approvalReminders = 0;
      const pendingWithoutReminder = await completionRepo.listPendingWithoutReminder();
      for (const completion of pendingWithoutReminder) {
        const hoursSinceCreated = (now.getTime() - completion.createdAt.getTime()) / HOUR_MS;
        if (hoursSinceCreated < APPROVAL_REMINDER_THRESHOLD_HOURS) continue;

        await notificationService.notifyParentsOfChoreAwaitingApproval({
          familyId: completion.chore.familyId,
          childFirstName: completion.chore.childUser.firstName,
          choreTitle: completion.chore.title,
          choreCompletionId: completion.id,
        });
        await completionRepo.markReminderSent(completion.id, now);
        approvalReminders += 1;
      }

      return { choreReminders, approvalReminders };
    },

    /** Distinct evening catch-up (gated to 18:00+ UTC, same convention as the meal-plan/laundry
     * evening notices), separate from the hourly threshold-based reminder above: once a day,
     * nudges about any still-undone WEEKLY/ONCE chore, mentioning it can be postponed to
     * tomorrow. DAILY chores are skipped — they already reset every day on their own. */
    async processEveningReminders(now: Date = new Date()): Promise<number> {
      if (now.getUTCHours() < 18) return 0;

      const today = getStartOfDay(now);
      let sent = 0;
      const activeChores = await choreRepo.listAllActive(now);
      for (const chore of activeChores) {
        if (chore.recurrence === 'DAILY') continue;
        if (chore.lastEveningReminderSentAt && getStartOfDay(chore.lastEveningReminderSentAt).getTime() === today.getTime()) {
          continue;
        }

        const period = periodStartFor(chore, now);
        const existing = await completionRepo.findActiveForPeriod(chore.id, period);
        if (existing) continue;

        await notificationService.notifyChoreEveningReminder({
          childUserId: chore.childUserId,
          choreTitle: chore.title,
          choreId: chore.id,
        });
        await choreRepo.markEveningReminderSent(chore.id, now);
        sent += 1;
      }

      return sent;
    },
  };
}

export type ChoreService = ReturnType<typeof createChoreService>;
