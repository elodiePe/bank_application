// GitHub Pages has no server-side rewrite: a deep link like /history 404s on refresh.
// The classic fix is serving index.html as the 404 page too — the SPA shell loads,
// then React Router reads the real URL and renders the right screen client-side.
import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../dist');
copyFileSync(path.join(distDir, 'index.html'), path.join(distDir, '404.html'));
console.log('Copié dist/index.html -> dist/404.html (fallback SPA pour GitHub Pages)');
