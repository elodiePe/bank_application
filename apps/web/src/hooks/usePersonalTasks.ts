import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePersonalTaskInput, UpdatePersonalTaskInput } from '@banque-familiale/shared';
import {
  createPersonalTask,
  deletePersonalTask,
  fetchMyPersonalTasks,
  updatePersonalTask,
} from '../services/personalTask.service.js';

function useInvalidatePersonalTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['personal-tasks'] });
}

export function useMyPersonalTasks() {
  return useQuery({ queryKey: ['personal-tasks', 'mine'], queryFn: fetchMyPersonalTasks, staleTime: 15_000 });
}

export function useCreatePersonalTask() {
  const invalidate = useInvalidatePersonalTasks();
  return useMutation({
    mutationFn: (input: CreatePersonalTaskInput) => createPersonalTask(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePersonalTask() {
  const invalidate = useInvalidatePersonalTasks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePersonalTaskInput }) => updatePersonalTask(id, input),
    onSuccess: invalidate,
  });
}

export function useDeletePersonalTask() {
  const invalidate = useInvalidatePersonalTasks();
  return useMutation({
    mutationFn: (id: string) => deletePersonalTask(id),
    onSuccess: invalidate,
  });
}
