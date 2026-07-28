import type { CreatePointsRewardInput, PointsRewardSummary } from '@banque-familiale/shared';
import { apiDelete, apiGet, apiPost } from './api.js';

export function fetchPointsRewards(): Promise<PointsRewardSummary[]> {
  return apiGet<PointsRewardSummary[]>('/points-rewards');
}

export function createPointsReward(input: CreatePointsRewardInput): Promise<PointsRewardSummary> {
  return apiPost<PointsRewardSummary>('/points-rewards', input);
}

export function deletePointsReward(id: string): Promise<void> {
  return apiDelete<void>(`/points-rewards/${id}`);
}
