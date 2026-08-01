import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpsertSavingsGoalInput } from '@banque-familiale/shared';
import { deleteMySavingsGoal, fetchMySavingsGoal, upsertMySavingsGoal } from '../services/savingsGoal.service.js';

export function useMySavingsGoal() {
  return useQuery({ queryKey: ['savings-goal', 'mine'], queryFn: fetchMySavingsGoal, staleTime: 15_000 });
}

function useInvalidateSavingsGoal() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
}

export function useUpsertSavingsGoal() {
  const invalidate = useInvalidateSavingsGoal();
  return useMutation({
    mutationFn: (input: UpsertSavingsGoalInput) => upsertMySavingsGoal(input),
    onSuccess: invalidate,
  });
}

export function useDeleteSavingsGoal() {
  const invalidate = useInvalidateSavingsGoal();
  return useMutation({
    mutationFn: deleteMySavingsGoal,
    onSuccess: invalidate,
  });
}
