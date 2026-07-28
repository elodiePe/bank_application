/** Returns midnight UTC of the Monday starting the ISO week containing `date`. */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

/** Midnight UTC of the day containing `date`. */
export function getStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** 0 = Monday .. 6 = Sunday (JS's own getUTCDay is 0 = Sunday .. 6 = Saturday). */
export function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

// A known Monday, arbitrary but fixed — only used as a stable zero-point so week numbers
// never shift if this file changes.
const WEEK_INDEX_EPOCH = new Date(Date.UTC(2024, 0, 1));

/** Monotonically increasing week number, stable across restarts/deploys — used to drive
 * automatic weekly rotation without storing any "current week" state anywhere. */
export function weekIndexFor(date: Date): number {
  const monday = getMondayOfWeek(date);
  return Math.round((monday.getTime() - WEEK_INDEX_EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000));
}
