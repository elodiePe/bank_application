import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type ShortcutKey = 'chores' | 'meals' | 'shopping' | 'stocks';

const DEFAULT_ORDER: ShortcutKey[] = ['chores', 'meals', 'shopping', 'stocks'];

function storageKey(userId: string): string {
  return `shortcut-usage:${userId}`;
}

function readCounts(userId: string): Partial<Record<ShortcutKey, number>> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as Partial<Record<ShortcutKey, number>>) : {};
  } catch {
    return {};
  }
}

/** Which shortcut (if any) a given URL corresponds to — mirrors the ?tab= query params used by
 * MoneyPage and ChoresPage's own sub-tab state. */
function shortcutFor(pathname: string, search: string): ShortcutKey | null {
  const tab = new URLSearchParams(search).get('tab');
  if (pathname === '/chores') {
    if (tab === 'meals') return 'meals';
    if (tab === 'shopping') return 'shopping';
    return 'chores';
  }
  if (pathname === '/dashboard' && tab === 'stocks') return 'stocks';
  return null;
}

/** Bumps a per-member usage counter (in localStorage, so it survives reloads but never leaves
 * the device) every time the user lands on one of the four shortcut destinations — used to
 * order Accueil's dynamic shortcuts by what this member actually uses most. */
export function useTrackShortcutUsage(userId: string | undefined) {
  const location = useLocation();

  useEffect(() => {
    if (!userId) return;
    const key = shortcutFor(location.pathname, location.search);
    if (!key) return;

    const counts = readCounts(userId);
    counts[key] = (counts[key] ?? 0) + 1;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(counts));
    } catch {
      // Usage ranking is a nice-to-have — never worth breaking navigation over (private
      // browsing, storage quota, etc. can all make this throw).
    }
  }, [userId, location.pathname, location.search]);
}

/** The four shortcut keys, most-used-first for this member (ties keep the default order). */
export function useShortcutOrder(userId: string | undefined): ShortcutKey[] {
  if (!userId) return DEFAULT_ORDER;
  const counts = readCounts(userId);
  return [...DEFAULT_ORDER].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
}
