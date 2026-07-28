import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateChoreInput, UpdateChoreInput } from '@banque-familiale/shared';
import {
  approveChoreCompletion,
  completeChore,
  createChore,
  fetchFamilyChores,
  fetchMyChores,
  fetchPendingChoreCompletions,
  rejectChoreCompletion,
  updateChore,
} from '../services/chore.service.js';

function useInvalidateChoresAndDashboard() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['chores'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useFamilyChores() {
  return useQuery({ queryKey: ['chores', 'family'], queryFn: fetchFamilyChores, staleTime: 15_000 });
}

export function useMyChores() {
  return useQuery({ queryKey: ['chores', 'mine'], queryFn: fetchMyChores, staleTime: 15_000 });
}

export function usePendingChoreCompletions() {
  return useQuery({
    queryKey: ['chores', 'pending'],
    queryFn: fetchPendingChoreCompletions,
    staleTime: 15_000,
  });
}

export function useCreateChore() {
  const invalidate = useInvalidateChoresAndDashboard();
  return useMutation({
    mutationFn: (input: CreateChoreInput) => createChore(input),
    onSuccess: invalidate,
  });
}

export function useUpdateChore() {
  const invalidate = useInvalidateChoresAndDashboard();
  return useMutation({
    mutationFn: ({ choreId, input }: { choreId: string; input: UpdateChoreInput }) => updateChore(choreId, input),
    onSuccess: invalidate,
  });
}

export function useCompleteChore() {
  const invalidate = useInvalidateChoresAndDashboard();
  return useMutation({
    mutationFn: (choreId: string) => completeChore(choreId),
    onSuccess: invalidate,
  });
}

export function useApproveChoreCompletion() {
  const invalidate = useInvalidateChoresAndDashboard();
  return useMutation({
    mutationFn: (completionId: string) => approveChoreCompletion(completionId),
    onSuccess: invalidate,
  });
}

export function useRejectChoreCompletion() {
  const invalidate = useInvalidateChoresAndDashboard();
  return useMutation({
    mutationFn: (completionId: string) => rejectChoreCompletion(completionId),
    onSuccess: invalidate,
  });
}
