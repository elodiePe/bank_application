import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SetMealPlanChoreConfigInput,
  SetMealPlanDayInput,
  SetMealPlanOccurrenceStatusInput,
  SetMealPlanRotationOrderInput,
} from '@banque-familiale/shared';
import {
  fetchMealPlanChoreConfig,
  fetchMealPlanConfig,
  fetchMealPlanRotationOrder,
  fetchMealPlanUpcoming,
  setMealPlanChoreConfig,
  setMealPlanDay,
  setMealPlanOccurrenceStatus,
  setMealPlanRotationOrder,
} from '../services/mealPlan.service.js';

export function useMealPlanConfig() {
  return useQuery({ queryKey: ['meal-plan', 'config'], queryFn: fetchMealPlanConfig, staleTime: 30_000 });
}

export function useMealPlanUpcoming(days = 7) {
  return useQuery({
    queryKey: ['meal-plan', 'upcoming', days],
    queryFn: () => fetchMealPlanUpcoming(days),
    staleTime: 30_000,
  });
}

export function useMealPlanRotationOrder() {
  return useQuery({ queryKey: ['meal-plan', 'rotation-order'], queryFn: fetchMealPlanRotationOrder, staleTime: 30_000 });
}

export function useSetMealPlanRotationOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetMealPlanRotationOrderInput) => setMealPlanRotationOrder(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useSetMealPlanDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetMealPlanDayInput) => setMealPlanDay(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useMealPlanChoreConfig() {
  return useQuery({ queryKey: ['meal-plan', 'chore-config'], queryFn: fetchMealPlanChoreConfig, staleTime: 30_000 });
}

export function useSetMealPlanChoreConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetMealPlanChoreConfigInput) => setMealPlanChoreConfig(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useSetMealPlanOccurrenceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetMealPlanOccurrenceStatusInput) => setMealPlanOccurrenceStatus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}
