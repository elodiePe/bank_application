import { z } from 'zod';

/** Index 0 = Monday .. 6 = Sunday, matching the weekday numbering used across the app
 * (getMondayOfWeek et al.). */
export const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export type MealPlanDayMode = 'FIXED' | 'ROTATING';

/** How one weekday is configured — FIXED always resolves to `fixedUserIds` (one or more people
 * doing it together). ROTATING draws from the family's single shared rotation order instead of
 * carrying its own list. */
export interface MealPlanDayConfig {
  weekday: number;
  mode: MealPlanDayMode;
  fixedUserIds: string[];
  fixedFirstNames: string[];
}

/** One resolved calendar date — who's actually cooking that day. Several people can share the
 * same turn (`assignedUserIds` has more than one entry). `done` is a personal, self-reported
 * checkbox — it never changes who's assigned. `postponedTo` is set when whoever was due that
 * day pushed it to another date instead (that date's entry gains them as an extra assignee). */
export interface MealPlanDaySummary {
  date: string;
  weekday: number;
  assignedUserIds: string[];
  assignedFirstNames: string[];
  done: boolean;
  postponedTo: string | null;
}

export const setMealPlanOccurrenceStatusSchema = z
  .object({
    date: z.string().min(1),
    done: z.boolean().optional(),
    /** A date string sets the postponement; explicit `null` clears it (undo). Omitted leaves
     * it untouched. */
    postponeToDate: z.string().min(1).nullable().optional(),
  })
  .refine((data) => data.done !== undefined || data.postponeToDate !== undefined, {
    message: 'done ou postponeToDate requis',
  });
export type SetMealPlanOccurrenceStatusInput = z.infer<typeof setMealPlanOccurrenceStatusSchema>;

/** The one rotation order shared by every ROTATING weekday — an ordered list of turns, each
 * turn being one or more people doing it together. */
export interface MealPlanRotationOrderSummary {
  orderedGroups: string[][];
  orderedGroupFirstNames: string[][];
}

export const setMealPlanDaySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    mode: z.enum(['FIXED', 'ROTATING']),
    fixedUserIds: z.array(z.string().min(1)).max(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'FIXED' && (!data.fixedUserIds || data.fixedUserIds.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Au moins une personne requise', path: ['fixedUserIds'] });
    }
  });
export type SetMealPlanDayInput = z.infer<typeof setMealPlanDaySchema>;

export const setMealPlanRotationOrderSchema = z.object({
  orderedGroups: z.array(z.array(z.string().min(1)).min(1)).max(20),
});
export type SetMealPlanRotationOrderInput = z.infer<typeof setMealPlanRotationOrderSchema>;

/** Family-wide opt-in: when `enabled`, today's cook (if a child) also gets a real Chore for
 * the day, using this reward/approval config — same reward union as chore.ts. */
export interface MealPlanChoreConfigSummary {
  enabled: boolean;
  requiresApproval: boolean;
  rewardType: 'MONEY' | 'POINTS' | 'NONE';
  rewardCents: number | null;
  rewardPoints: number | null;
}

export const setMealPlanChoreConfigSchema = z
  .object({
    enabled: z.boolean(),
    requiresApproval: z.boolean(),
    rewardType: z.enum(['MONEY', 'POINTS', 'NONE']),
    rewardCents: z.number().int().positive().optional(),
    rewardPoints: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    if (data.rewardType === 'MONEY' && data.rewardCents === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Montant requis', path: ['rewardCents'] });
    }
    if (data.rewardType === 'POINTS' && data.rewardPoints === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Nombre de points requis', path: ['rewardPoints'] });
    }
  });
export type SetMealPlanChoreConfigInput = z.infer<typeof setMealPlanChoreConfigSchema>;
