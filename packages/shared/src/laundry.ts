import { z } from 'zod';

/** Reuses meal plan's FIXED/ROTATING vocabulary — same two modes, same meaning, just applied
 * to a user-named laundry type instead of a weekday. */
export type LaundryMode = 'FIXED' | 'ROTATING';

/** When a type is due. ONCE: a single specific calendar date, never repeats. WEEKLY: one
 * weekday, every week. MULTIPLE: several weekdays, all recurring every week. Drives both the
 * rotation math and the day-before/day-of notification job. Weekdays reuse meal plan's
 * WEEKDAY_LABELS (0 = Monday .. 6 = Sunday) — import that directly where a label is needed. */
export type LaundryScheduleType = 'ONCE' | 'WEEKLY' | 'MULTIPLE';

export const LAUNDRY_SCHEDULE_TYPE_LABELS: Record<LaundryScheduleType, string> = {
  ONCE: 'Une seule fois',
  WEEKLY: 'Toujours ce jour',
  MULTIPLE: 'Plusieurs jours',
};

/** One user-named laundry type (e.g. "Blancs", "Couleurs", "Draps") and its configuration. */
export interface LaundryTypeSummary {
  id: string;
  name: string;
  order: number;
  mode: LaundryMode;
  fixedUserIds: string[];
  fixedFirstNames: string[];
  /** An ordered list of turns — each turn is one or more people doing it together. */
  rotationGroups: string[][];
  rotationGroupFirstNames: string[][];
  scheduleType: LaundryScheduleType;
  /** Populated for WEEKLY (one entry) and MULTIPLE (several), empty for ONCE. */
  weekdays: number[];
  /** ISO date, populated only for ONCE. */
  onceDate: string | null;
  /** When true, whoever's due also gets a real Chore for the day (only when they're a child).
   * The chore* fields are only meaningful when this is true. */
  generatesChore: boolean;
  choreRequiresApproval: boolean;
  choreRewardType: 'MONEY' | 'POINTS' | 'NONE' | null;
  choreRewardCents: number | null;
  choreRewardPoints: number | null;
}

/** One resolved calendar date — which laundry type is due, and who's doing it. Several people
 * can share the same turn, and several occurrences can share the same date if more than one
 * type is scheduled that day. `done` is a personal, self-reported checkbox — it never changes
 * who's due next. A postponed occurrence never appears at its original date — only once, at
 * whichever date it was pushed to, with `postponedFrom` set to where it came from. */
export interface LaundryOccurrenceSummary {
  date: string;
  weekday: number;
  laundryTypeId: string;
  laundryTypeName: string;
  assignedUserIds: string[];
  assignedFirstNames: string[];
  done: boolean;
  postponedFrom: string | null;
}

export const setLaundryOccurrenceStatusSchema = z
  .object({
    laundryTypeId: z.string().min(1),
    date: z.string().min(1),
    done: z.boolean().optional(),
    /** A date string sets the postponement; explicit `null` clears it (undo). Omitted leaves
     * it untouched. */
    postponeToDate: z.string().min(1).nullable().optional(),
  })
  .refine((data) => data.done !== undefined || data.postponeToDate !== undefined, {
    message: 'done ou postponeToDate requis',
  });
export type SetLaundryOccurrenceStatusInput = z.infer<typeof setLaundryOccurrenceStatusSchema>;

export const createLaundryTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    mode: z.enum(['FIXED', 'ROTATING']),
    fixedUserIds: z.array(z.string().min(1)).max(10).optional(),
    rotationGroups: z.array(z.array(z.string().min(1)).min(1)).max(20).optional(),
    scheduleType: z.enum(['ONCE', 'WEEKLY', 'MULTIPLE']),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    onceDate: z.string().min(1).optional(),
    generatesChore: z.boolean().optional(),
    choreRequiresApproval: z.boolean().optional(),
    choreRewardType: z.enum(['MONEY', 'POINTS', 'NONE']).optional(),
    choreRewardCents: z.number().int().positive().optional(),
    choreRewardPoints: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'FIXED' && (!data.fixedUserIds || data.fixedUserIds.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Au moins une personne requise', path: ['fixedUserIds'] });
    }
    if (data.mode === 'ROTATING' && (!data.rotationGroups || data.rotationGroups.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Ordre de rotation requis', path: ['rotationGroups'] });
    }
    if (data.scheduleType === 'ONCE' && !data.onceDate) {
      ctx.addIssue({ code: 'custom', message: 'Date requise', path: ['onceDate'] });
    }
    if (data.scheduleType === 'WEEKLY' && (!data.weekdays || data.weekdays.length !== 1)) {
      ctx.addIssue({ code: 'custom', message: 'Un seul jour requis', path: ['weekdays'] });
    }
    if (data.scheduleType === 'MULTIPLE' && (!data.weekdays || data.weekdays.length < 2)) {
      ctx.addIssue({ code: 'custom', message: 'Au moins deux jours requis', path: ['weekdays'] });
    }
    if (data.generatesChore) {
      if (data.choreRewardType === 'MONEY' && data.choreRewardCents === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Montant requis', path: ['choreRewardCents'] });
      }
      if (data.choreRewardType === 'POINTS' && data.choreRewardPoints === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Nombre de points requis', path: ['choreRewardPoints'] });
      }
      if (!data.choreRewardType) {
        ctx.addIssue({ code: 'custom', message: 'Type de récompense requis', path: ['choreRewardType'] });
      }
    }
  });
export type CreateLaundryTypeInput = z.infer<typeof createLaundryTypeSchema>;

export const updateLaundryTypeSchema = createLaundryTypeSchema;
export type UpdateLaundryTypeInput = z.infer<typeof updateLaundryTypeSchema>;

export const reorderLaundryTypesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(50),
});
export type ReorderLaundryTypesInput = z.infer<typeof reorderLaundryTypesSchema>;
