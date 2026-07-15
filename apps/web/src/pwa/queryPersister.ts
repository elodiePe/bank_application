import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const IDB_KEY = 'banque-familiale-query-cache';

/**
 * IndexedDB-backed persister so the last known balances/history/notifications
 * survive a full reload while offline (localStorage would be too small/sync).
 */
export const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, client);
  },
  restoreClient: async () => {
    return get<PersistedClient>(IDB_KEY);
  },
  removeClient: async () => {
    await del(IDB_KEY);
  },
};
