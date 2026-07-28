import { z } from 'zod';

export type ChoreRecurrence = 'ONCE' | 'DAILY' | 'WEEKLY';
export type ChoreCompletionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/** MONEY moves real money (a Transaction) on approval; POINTS just adds to a purely
 * cosmetic score kept on the child's account — no conversion, no redemption. */
export type ChoreRewardType = 'MONEY' | 'POINTS';

export const CHORE_RECURRENCE_LABELS: Record<ChoreRecurrence, string> = {
  ONCE: 'Une seule fois',
  DAILY: 'Tous les jours',
  WEEKLY: 'Toutes les semaines',
};

export const CHORE_REWARD_TYPE_LABELS: Record<ChoreRewardType, string> = {
  MONEY: 'Argent',
  POINTS: 'Points',
};

export interface ChoreSummary {
  id: string;
  childUserId: string;
  childFirstName: string;
  title: string;
  rewardType: ChoreRewardType;
  /** Non-null only when rewardType is MONEY. */
  rewardCents: number | null;
  /** Non-null only when rewardType is POINTS. */
  rewardPoints: number | null;
  recurrence: ChoreRecurrence;
  active: boolean;
  /** Status of the completion for the current period (day/week), if any was submitted. */
  currentPeriodStatus: ChoreCompletionStatus | null;
  createdAt: string;
}

export interface ChoreCompletionSummary {
  id: string;
  choreId: string;
  choreTitle: string;
  childUserId: string;
  childFirstName: string;
  periodStart: string;
  status: ChoreCompletionStatus;
  rewardType: ChoreRewardType;
  rewardCents: number | null;
  rewardPoints: number | null;
  respondedByFirstName: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export const createChoreSchema = z
  .object({
    childUserId: z.string().min(1),
    title: z.string().trim().min(1, 'Le titre est requis').max(80),
    rewardType: z.enum(['MONEY', 'POINTS']),
    rewardCents: z.number().int().positive('La récompense doit être positive').optional(),
    rewardPoints: z.number().int().positive('La récompense doit être positive').optional(),
    recurrence: z.enum(['ONCE', 'DAILY', 'WEEKLY']),
  })
  .superRefine((data, ctx) => {
    if (data.rewardType === 'MONEY' && data.rewardCents === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Montant requis', path: ['rewardCents'] });
    }
    if (data.rewardType === 'POINTS' && data.rewardPoints === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Nombre de points requis', path: ['rewardPoints'] });
    }
  });
export type CreateChoreInput = z.infer<typeof createChoreSchema>;

export const updateChoreSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  rewardType: z.enum(['MONEY', 'POINTS']).optional(),
  rewardCents: z.number().int().positive().optional(),
  rewardPoints: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});
export type UpdateChoreInput = z.infer<typeof updateChoreSchema>;

/** Ready-made suggestions shown when adding a chore, so a parent isn't starting from a
 * blank field — the amounts are only starting points, always editable, and only apply to
 * the money reward type (points has no natural default). */
export const CHORE_TEMPLATES: { title: string; suggestedRewardCents: number }[] = [
  { title: 'Faire son lit', suggestedRewardCents: 50 },
  { title: 'Débarrasser la table', suggestedRewardCents: 50 },
  { title: 'Ranger sa chambre', suggestedRewardCents: 100 },
  { title: 'Sortir les poubelles', suggestedRewardCents: 100 },
  { title: 'Faire la vaisselle', suggestedRewardCents: 100 },
  { title: "Nourrir l'animal", suggestedRewardCents: 50 },
  { title: 'Faire ses devoirs', suggestedRewardCents: 100 },
  { title: "Passer l'aspirateur", suggestedRewardCents: 150 },
  { title: 'Mettre la table', suggestedRewardCents: 50 },
  { title: 'Arroser les plantes', suggestedRewardCents: 50 },
];
