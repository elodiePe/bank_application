import type { ChoreSummary } from '@banque-familiale/shared';
import { formatMoney, STORAGE_CURRENCY } from './currency.js';

/** "12.50 CHF", "20 points", or "Aucune récompense", whichever the chore/completion actually
 * rewards. */
export function formatChoreReward(reward: Pick<ChoreSummary, 'rewardType' | 'rewardCents' | 'rewardPoints'>): string {
  if (reward.rewardType === 'NONE') return '';
  if (reward.rewardType === 'POINTS') return `${reward.rewardPoints ?? 0} points`;
  return formatMoney(reward.rewardCents ?? 0, STORAGE_CURRENCY);
}
