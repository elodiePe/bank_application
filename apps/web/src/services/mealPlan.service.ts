import type {
  MealPlanDayConfig,
  MealPlanDaySummary,
  MealPlanRotationOrderSummary,
  SetMealPlanDayInput,
  SetMealPlanRotationOrderInput,
} from '@banque-familiale/shared';
import { apiGet, apiPut } from './api.js';

export function fetchMealPlanConfig(): Promise<MealPlanDayConfig[]> {
  return apiGet<MealPlanDayConfig[]>('/meal-plan');
}

export function fetchMealPlanUpcoming(days = 7): Promise<MealPlanDaySummary[]> {
  return apiGet<MealPlanDaySummary[]>(`/meal-plan/upcoming?days=${days}`);
}

export function fetchMealPlanRotationOrder(): Promise<MealPlanRotationOrderSummary> {
  return apiGet<MealPlanRotationOrderSummary>('/meal-plan/rotation-order');
}

export function setMealPlanRotationOrder(input: SetMealPlanRotationOrderInput): Promise<MealPlanRotationOrderSummary> {
  return apiPut<MealPlanRotationOrderSummary>('/meal-plan/rotation-order', input);
}

export function setMealPlanDay(input: SetMealPlanDayInput): Promise<MealPlanDayConfig> {
  return apiPut<MealPlanDayConfig>('/meal-plan/day', input);
}
