// Literal (not interpolated) so Tailwind's class scanner always picks them up. Hues are spread
// far apart around the wheel (not just adjacent pastels) so who's assigned reads from color
// alone, at a glance, without needing to read the name. A colored left border reinforces the
// same hue as a second, stronger band beyond the background tint. Shared by the meal plan and
// laundry screens so the same person always gets the same visual treatment in both places.
export interface PersonStyle {
  bg: string;
  border: string;
  text: string;
}

export const PERSON_STYLES: PersonStyle[] = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-600', text: 'text-blue-800 dark:text-blue-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-400 dark:border-rose-600', text: 'text-rose-800 dark:text-rose-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-800 dark:text-amber-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-800 dark:text-emerald-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-400 dark:border-violet-600', text: 'text-violet-800 dark:text-violet-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-400 dark:border-cyan-600', text: 'text-cyan-800 dark:text-cyan-300' },
];

/** Assigns each distinct person a stable color by first appearance in `items`. */
export function buildPersonColorMap(items: { assignedUserIds: string[] }[]): Map<string, PersonStyle> {
  const map = new Map<string, PersonStyle>();
  for (const item of items) {
    for (const userId of item.assignedUserIds) {
      if (!map.has(userId)) {
        map.set(userId, PERSON_STYLES[map.size % PERSON_STYLES.length]!);
      }
    }
  }
  return map;
}
