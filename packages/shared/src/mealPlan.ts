import { z } from 'zod';

/** Index 0 = Monday .. 6 = Sunday, matching the weekday numbering used across the app
 * (getMondayOfWeek et al.). */
export const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export type MealPlanDayMode = 'FIXED' | 'ROTATING';

/** How one weekday is configured — FIXED always resolves to `fixedUserId`. ROTATING draws
 * from the family's single shared rotation order instead of carrying its own list. */
export interface MealPlanDayConfig {
  weekday: number;
  mode: MealPlanDayMode;
  fixedUserId: string | null;
  fixedFirstName: string | null;
}

/** One resolved calendar date — who's actually cooking that day. */
export interface MealPlanDaySummary {
  date: string;
  weekday: number;
  assignedUserId: string | null;
  assignedFirstName: string | null;
}

/** The one rotation order shared by every ROTATING weekday. */
export interface MealPlanRotationOrderSummary {
  orderedUserIds: string[];
  orderedFirstNames: string[];
}

export const setMealPlanDaySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    mode: z.enum(['FIXED', 'ROTATING']),
    fixedUserId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'FIXED' && !data.fixedUserId) {
      ctx.addIssue({ code: 'custom', message: 'Personne requise', path: ['fixedUserId'] });
    }
  });
export type SetMealPlanDayInput = z.infer<typeof setMealPlanDaySchema>;

export const setMealPlanRotationOrderSchema = z.object({
  orderedUserIds: z.array(z.string().min(1)).min(1).max(20),
});
export type SetMealPlanRotationOrderInput = z.infer<typeof setMealPlanRotationOrderSchema>;
