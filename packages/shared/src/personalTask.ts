import { z } from 'zod';

/** A to-do created by a family member for themselves — no reward, no approval, just a title
 * and a done flag toggled by the owner. Either a standing daily habit (`recurring: true`,
 * `date` unused — `done` reflects only today) or a one-off task for a specific `date`
 * (`recurring: false`, `done` is a simple persistent flag). */
export interface PersonalTaskSummary {
  id: string;
  title: string;
  recurring: boolean;
  /** ISO date, only meaningful when `recurring` is false. */
  date: string | null;
  done: boolean;
  createdAt: string;
}

export const createPersonalTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    recurring: z.boolean(),
    date: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.recurring && !data.date) {
      ctx.addIssue({ code: 'custom', message: 'Date requise', path: ['date'] });
    }
  });
export type CreatePersonalTaskInput = z.infer<typeof createPersonalTaskSchema>;

export const updatePersonalTaskSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  done: z.boolean().optional(),
  /** Postpones a one-off task to a new date; meaningless on a recurring task. */
  date: z.string().min(1).optional(),
});
export type UpdatePersonalTaskInput = z.infer<typeof updatePersonalTaskSchema>;
