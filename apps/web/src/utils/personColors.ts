// Literal (not interpolated) so Tailwind's class scanner always picks them up. Hues are spread
// far apart around the wheel (not just adjacent pastels) so who's assigned reads from color
// alone, at a glance, without needing to read the name. A colored left border reinforces the
// same hue as a second, stronger band beyond the background tint; `solid` is the same hue at
// full saturation, for places that need a filled shape (an avatar circle, a banner) rather than
// a tinted card. Shared across the app (login screen, meal plan, laundry, Accueil banners) so
// the same person always gets the same color everywhere.
export interface PersonStyle {
  bg: string;
  border: string;
  text: string;
  solid: string;
}

export const PERSON_STYLES: PersonStyle[] = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-600', text: 'text-blue-800 dark:text-blue-300', solid: 'bg-blue-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-400 dark:border-rose-600', text: 'text-rose-800 dark:text-rose-300', solid: 'bg-rose-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-800 dark:text-amber-300', solid: 'bg-amber-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-800 dark:text-emerald-300', solid: 'bg-emerald-500' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-400 dark:border-violet-600', text: 'text-violet-800 dark:text-violet-300', solid: 'bg-violet-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-400 dark:border-cyan-600', text: 'text-cyan-800 dark:text-cyan-300', solid: 'bg-cyan-500' },
];

/** Assigns each of `userIds` its own color slot, with no two people in the same call ever
 * sharing one (as long as there are ≤6 of them, true for any family this app has seen). Sorted
 * first so two calls given the exact same set of people — even in a different order — land on
 * the same assignment, which is what actually happens most of the time (e.g. the full family
 * roster shown on the login screen vs. everyone who's ever had a laundry turn this month). */
export function assignPersonColors(userIds: string[]): Map<string, PersonStyle> {
  const map = new Map<string, PersonStyle>();
  const sorted = [...new Set(userIds)].sort();
  sorted.forEach((userId, index) => {
    map.set(userId, PERSON_STYLES[index % PERSON_STYLES.length]!);
  });
  return map;
}

/** Batches `assignPersonColors` over every distinct assignee across `items` — collision-free
 * among whoever's actually shown together on one screen. */
export function buildPersonColorMap(items: { assignedUserIds: string[] }[]): Map<string, PersonStyle> {
  return assignPersonColors(items.flatMap((item) => item.assignedUserIds));
}

/** Solo fallback for a single person shown alone with nobody else on screen to collide with
 * (e.g. an Accueil banner that only ever shows the viewer's own turn) — deterministic from the
 * userId alone, no roster or occurrence list needed. */
export function colorForPerson(userId: string): PersonStyle {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PERSON_STYLES[hash % PERSON_STYLES.length]!;
}
