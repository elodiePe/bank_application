import { z } from 'zod';

/** One reward tier a parent defines for a specific child's cosmetic chore-points score, e.g.
 * "100 points = choisir le dessert". Per-child — each child has their own ladder, compared
 * against their own pointsBalance. */
export interface PointsRewardSummary {
  id: string;
  childUserId: string;
  childFirstName: string;
  title: string;
  pointsRequired: number;
}

export const createPointsRewardSchema = z.object({
  childUserId: z.string().min(1),
  title: z.string().trim().min(1, 'Le nom est requis').max(60),
  pointsRequired: z.number().int().positive('Le nombre de points doit être positif'),
});
export type CreatePointsRewardInput = z.infer<typeof createPointsRewardSchema>;
