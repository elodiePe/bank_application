import { useCurrentUser } from './useAuth.js';
import { useMealPlanUpcoming, useSetMealPlanOccurrenceStatus } from './useMealPlan.js';
import { useLaundryUpcoming, useSetLaundryOccurrenceStatus } from './useLaundry.js';

export interface DutyRow {
  key: string;
  kind: 'meal' | 'laundry';
  laundryTypeId?: string;
  date: string;
  label: string;
  icon: string;
  withNames: string[];
  done: boolean;
  postponedTo: string | null;
}

export function tomorrowOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Meal-plan cooking turns and laundry turns for the current member, for the coming week —
 * not real Chore rows (a Chore always belongs to a child and carries a reward), but shown
 * merged into "Mes tâches" since from the member's point of view it's just another thing on
 * their plate this week. `setStatus` marks a row done (or undoes that) or pushes it to
 * tomorrow (or undoes that) — none of it changes the underlying calendar-driven rotation, just
 * what that occurrence shows. */
export function useWeeklyDuties() {
  const { data: user } = useCurrentUser();
  const meals = useMealPlanUpcoming(7);
  const laundry = useLaundryUpcoming(7);
  const setMealStatus = useSetMealPlanOccurrenceStatus();
  const setLaundryStatus = useSetLaundryOccurrenceStatus();

  const rows: DutyRow[] = !user
    ? []
    : [
        ...(meals.data ?? [])
          .filter((day) => day.assignedUserIds.includes(user.id))
          .map((day) => ({
            key: `meal-${day.date}`,
            kind: 'meal' as const,
            date: day.date,
            label: 'Faire à manger',
            icon: '🍳',
            withNames: day.assignedFirstNames.filter((_, i) => day.assignedUserIds[i] !== user.id),
            done: day.done,
            postponedTo: day.postponedTo,
          })),
        ...(laundry.data ?? [])
          .filter((o) => o.assignedUserIds.includes(user.id))
          .map((o) => ({
            key: `laundry-${o.laundryTypeId}-${o.date}`,
            kind: 'laundry' as const,
            laundryTypeId: o.laundryTypeId,
            date: o.date,
            label: o.laundryTypeName,
            icon: '🧺',
            withNames: o.assignedFirstNames.filter((_, i) => o.assignedUserIds[i] !== user.id),
            done: o.done,
            postponedTo: o.postponedTo,
          })),
      ].sort((a, b) => a.date.localeCompare(b.date));

  function setStatus(row: DutyRow, data: { done?: boolean; postponeToDate?: string | null }) {
    if (row.kind === 'meal') {
      setMealStatus.mutate({ date: row.date, ...data });
    } else {
      setLaundryStatus.mutate({ laundryTypeId: row.laundryTypeId!, date: row.date, ...data });
    }
  }

  return {
    rows,
    isLoading: meals.isLoading || laundry.isLoading,
    isPending: setMealStatus.isPending || setLaundryStatus.isPending,
    setStatus,
  };
}
