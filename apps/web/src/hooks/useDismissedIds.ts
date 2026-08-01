import { useEffect, useState } from 'react';

function storageKey(namespace: string, userId: string): string {
  return `dismissed-${namespace}:${userId}`;
}

function readDismissed(namespace: string, userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(namespace, userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Which items (money requests, disputes, …) this member has dismissed from a list —
 * persisted in localStorage (device-local, never sent to the server) so a dismissed item stays
 * hidden across reloads and page navigations instead of reappearing every time. `namespace`
 * keeps different lists (e.g. "money-requests" vs "disputes") from colliding with each other. */
export function useDismissedIds(userId: string | undefined, namespace: string) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => (userId ? readDismissed(namespace, userId) : new Set()));

  useEffect(() => {
    setDismissed(userId ? readDismissed(namespace, userId) : new Set());
  }, [userId, namespace]);

  function dismiss(id: string) {
    if (!userId) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(storageKey(namespace, userId), JSON.stringify([...next]));
      } catch {
        // Dismissal is a nice-to-have — never worth breaking the UI over (private browsing,
        // storage quota, etc. can all make this throw).
      }
      return next;
    });
  }

  return { dismissed, dismiss };
}
