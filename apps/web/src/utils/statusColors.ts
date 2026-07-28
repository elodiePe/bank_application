/** Shared light-background tint for anything with a PENDING/APPROVED-ish/REJECTED-ish status —
 * money requests, chore completions, disputes — so the state reads at a glance regardless of
 * which list it's in. Falls back to the caller's own background (e.g. CANCELLED) when the
 * status isn't one of the three tracked here. */
export function statusBackgroundClass(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 dark:bg-amber-900/20';
    case 'APPROVED':
    case 'RESOLVED':
      return 'bg-emerald-50 dark:bg-emerald-900/20';
    case 'REJECTED':
    case 'DISMISSED':
      return 'bg-red-50 dark:bg-red-900/20';
    default:
      return 'bg-white dark:bg-slate-800';
  }
}
