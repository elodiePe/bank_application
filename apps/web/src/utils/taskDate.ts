/** Short date subtitle shared by every task-like card (chore/duty/personal task), e.g. "ven. 1 août". */
export function formatTaskDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
