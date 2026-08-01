import { z } from 'zod';

/** What a child is saving up for — one at a time. The "how much is missing" figure isn't
 * stored here: it's `targetCents - balanceCents`, computed client-side against whatever the
 * child's live balance already is. */
export interface SavingsGoalSummary {
  id: string;
  title: string;
  targetCents: number;
  /// Inline data URL (e.g. "data:image/jpeg;base64,…"), resized client-side before upload.
  photoDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// A resized photo (client-side, before upload) comfortably fits well under this — generous
// enough for a non-tiny image, tight enough to keep the request body sane.
const MAX_PHOTO_DATA_URL_LENGTH = 1_400_000;

export const upsertSavingsGoalSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(80),
  targetCents: z.number().int().positive('Le montant doit être positif'),
  photoDataUrl: z
    .string()
    .max(MAX_PHOTO_DATA_URL_LENGTH, 'Photo trop lourde')
    .regex(/^data:image\//, 'Format de photo invalide')
    .nullable()
    .optional(),
});
export type UpsertSavingsGoalInput = z.infer<typeof upsertSavingsGoalSchema>;
