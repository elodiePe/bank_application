import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePointsRewardInput } from '@banque-familiale/shared';
import { createPointsReward, deletePointsReward, fetchPointsRewards } from '../services/pointsReward.service.js';

export function usePointsRewards() {
  return useQuery({ queryKey: ['points-rewards'], queryFn: fetchPointsRewards, staleTime: 30_000 });
}

function useInvalidatePointsRewards() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['points-rewards'] });
}

export function useCreatePointsReward() {
  const invalidate = useInvalidatePointsRewards();
  return useMutation({
    mutationFn: (input: CreatePointsRewardInput) => createPointsReward(input),
    onSuccess: invalidate,
  });
}

export function useDeletePointsReward() {
  const invalidate = useInvalidatePointsRewards();
  return useMutation({
    mutationFn: (id: string) => deletePointsReward(id),
    onSuccess: invalidate,
  });
}
