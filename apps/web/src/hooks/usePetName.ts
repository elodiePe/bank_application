import { useEffect, useState } from 'react';

function storageKey(userId: string): string {
  return `pet-name:${userId}`;
}

/** The child's own name for their savings companion — purely cosmetic, device-local
 * (localStorage), never sent to the server. Falls back to `defaultName` (the current
 * evolution stage's species name) until the child picks something of their own. */
export function usePetName(userId: string | undefined, defaultName: string) {
  const [name, setNameState] = useState<string | null>(() => {
    if (!userId) return null;
    try {
      return localStorage.getItem(storageKey(userId));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!userId) return;
    try {
      setNameState(localStorage.getItem(storageKey(userId)));
    } catch {
      setNameState(null);
    }
  }, [userId]);

  function setName(next: string) {
    if (!userId) return;
    const trimmed = next.trim();
    setNameState(trimmed || null);
    try {
      if (trimmed) localStorage.setItem(storageKey(userId), trimmed);
      else localStorage.removeItem(storageKey(userId));
    } catch {
      // Renaming is a nice-to-have — never worth breaking the UI over.
    }
  }

  return { name: name ?? defaultName, hasCustomName: name !== null, setName };
}
