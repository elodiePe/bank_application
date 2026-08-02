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

/** Suggested starter ladder offered during onboarding — a parent can pick some, all, or none,
 * and refine amounts later from Maison like any other reward. */
export const POINTS_REWARD_TEMPLATES: { title: string; pointsRequired: number }[] = [
  { title: 'Choisir le dessert', pointsRequired: 50 },
  { title: 'Un petit plaisir', pointsRequired: 100 },
  { title: 'Sortie au choix', pointsRequired: 250 },
  { title: 'Cadeau surprise', pointsRequired: 500 },
];

export const createPointsRewardSchema = z.object({
  childUserId: z.string().min(1),
  title: z.string().trim().min(1, 'Le nom est requis').max(60),
  pointsRequired: z.number().int().positive('Le nombre de points doit être positif'),
});
export type CreatePointsRewardInput = z.infer<typeof createPointsRewardSchema>;
