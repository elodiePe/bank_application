import { z } from 'zod';

/** A parent-authored reminder. ONCE fires only on `date`; recurring fires every week on
 * `date`'s weekday. Both fire at `time` (HH:mm, UTC — same convention as the rest of the
 * app's date/time handling). `sendToAll` broadcasts to the whole family; otherwise only
 * `recipientUserIds` (meant for a chosen subset of children) gets it. */
export interface CustomNotificationSummary {
  id: string;
  title: string;
  body: string;
  date: string;
  recurring: boolean;
  time: string;
  sendToAll: boolean;
  recipientUserIds: string[];
  recipientFirstNames: string[];
  createdByFirstName: string;
  createdAt: string;
}

export const createCustomNotificationSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(300),
    date: z.string().min(1),
    recurring: z.boolean(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide'),
    sendToAll: z.boolean(),
    recipientUserIds: z.array(z.string().min(1)).max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.sendToAll && (!data.recipientUserIds || data.recipientUserIds.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Choisis au moins un destinataire', path: ['recipientUserIds'] });
    }
  });
export type CreateCustomNotificationInput = z.infer<typeof createCustomNotificationSchema>;
