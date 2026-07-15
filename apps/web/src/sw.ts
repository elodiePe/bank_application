/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Injected at build time by vite-plugin-pwa (injectManifest) with the app shell asset list.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

// Dashboard/overview reads: try the network for freshness, fall back to the last
// known snapshot when offline so the app still shows a (possibly stale) balance.
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/dashboard'),
  new NetworkFirst({
    cacheName: 'api-dashboard',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
  }),
);

// Other read-only API GETs (notifications, requests list...) — serve cached
// instantly then refresh in the background.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/dashboard'),
  new StaleWhileRevalidate({ cacheName: 'api-misc' }),
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Banque Familiale', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // No leading slash — resolved relative to the SW's own script location, which
      // already sits at the deployed base path (e.g. /bank_application/ on GitHub
      // Pages). A leading slash would instead resolve to the domain root and 404.
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // registration.scope already includes the deployed base path (e.g.
  // https://elodiepe.github.io/bank_application/) — resolving against it, rather than
  // against the bare origin, is what keeps this correct under a GitHub Pages sub-path.
  const requested = (event.notification.data as { url?: string } | undefined)?.url;
  const targetUrl = new URL(requested ?? '.', self.registration.scope).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = allClients.find((client) => client.url.includes(self.location.origin));
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await (existing as WindowClient).navigate(targetUrl);
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
