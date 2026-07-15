import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Set by CI to '/bank_application/' when deploying to GitHub Pages (a project page is
// served from a sub-path, not the domain root). Defaults to '/' for local dev and any
// host that serves the app from its own root (e.g. the API's own domain later on).
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Historical CSV/API responses must never be cached as app shell assets.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        // Relative to the manifest itself (served from `base`), so this works
        // unchanged whether the app lives at the domain root or under a sub-path.
        id: '.',
        name: 'Banque Familiale',
        short_name: 'Banque Familiale',
        description: "Gestion de l'argent de poche familial",
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3862f0',
        lang: 'fr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
