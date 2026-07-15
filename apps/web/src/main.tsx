import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { App } from './App.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { idbPersister } from './pwa/queryPersister.js';
import { OfflineBanner } from './pwa/OfflineBanner.js';
import { UpdatePrompt } from './pwa/UpdatePrompt.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Offline-restored data must never look "fresh" — always try a real
      // refetch first, falling back to the cached value only if that fails.
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        // Auth/PIN and one-off action results must never be replayed from disk.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && query.queryKey[0] !== 'auth',
        },
      }}
    >
      <ThemeProvider>
        <OfflineBanner />
        <App />
        <UpdatePrompt />
      </ThemeProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
