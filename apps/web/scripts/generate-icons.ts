/**
 * Generates the PWA icon set (a simple piggy-bank mark on the brand color) as flat PNGs,
 * with no native image dependency (pngjs is pure JS) so this runs anywhere without a
 * build toolchain for canvas/sharp. Re-run with `npm run generate:icons` after any tweak.
 */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../public/icons');

const BRAND = { r: 0x38, g: 0x62, b: 0xf0 }; // brand-500, matches tailwind.config.js

interface Point {
  x: number;
  y: number;
}

function inRoundedSquare(nx: number, ny: number, radius: number): boolean {
  // nx, ny in [-0.5, 0.5]. radius is the corner radius as a fraction of the size.
  const ax = Math.abs(nx) - (0.5 - radius);
  const ay = Math.abs(ny) - (0.5 - radius);
  if (ax <= 0 || ay <= 0) return true;
  return ax * ax + ay * ay <= radius * radius;
}

function inEllipse(nx: number, ny: number, center: Point, rx: number, ry: number): boolean {
  const dx = (nx - center.x) / rx;
  const dy = (ny - center.y) / ry;
  return dx * dx + dy * dy <= 1;
}

function inRect(nx: number, ny: number, center: Point, w: number, h: number): boolean {
  return Math.abs(nx - center.x) <= w / 2 && Math.abs(ny - center.y) <= h / 2;
}

/** Draws the piggy-bank mark. `scale` shrinks the whole mark (used for the maskable safe zone). */
function isPiggyMark(nx: number, ny: number, scale: number): boolean {
  const x = nx / scale;
  const y = ny / scale;

  const body = inEllipse(x, y, { x: 0, y: 0.03 }, 0.32, 0.24);
  const ear = inEllipse(x, y, { x: -0.06, y: -0.21 }, 0.07, 0.07);
  const snout = inEllipse(x, y, { x: 0.29, y: 0.06 }, 0.09, 0.07);
  const legFrontLeft = inRect(x, y, { x: -0.16, y: 0.28 }, 0.07, 0.09);
  const legFrontRight = inRect(x, y, { x: 0.16, y: 0.28 }, 0.07, 0.09);
  const legBackLeft = inRect(x, y, { x: -0.22, y: 0.26 }, 0.06, 0.08);
  const legBackRight = inRect(x, y, { x: 0.06, y: 0.26 }, 0.06, 0.08);

  const isMark = body || ear || snout || legFrontLeft || legFrontRight || legBackLeft || legBackRight;
  if (!isMark) return false;

  // Cut-outs (rendered in the background color): coin slot + eye.
  const coinSlot = inRect(x, y, { x: -0.02, y: -0.24 }, 0.14, 0.03);
  const eye = inEllipse(x, y, { x: 0.14, y: -0.03 }, 0.025, 0.025);
  if (coinSlot || eye) return false;

  return true;
}

function generateIcon(size: number, { maskable = false } = {}): Buffer {
  const png = new PNG({ width: size, height: size });
  const cornerRadius = maskable ? 0 : 0.22;
  const markScale = maskable ? 0.55 : 0.72; // maskable icons need a safe-zone margin

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size - 0.5;
      const ny = py / size - 0.5;
      const idx = (size * py + px) << 2;

      const withinSquare = inRoundedSquare(nx, ny, cornerRadius);
      if (!withinSquare) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      const isMark = isPiggyMark(nx, ny, markScale);
      if (isMark) {
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = 255;
      } else {
        png.data[idx] = BRAND.r;
        png.data[idx + 1] = BRAND.g;
        png.data[idx + 2] = BRAND.b;
        png.data[idx + 3] = 255;
      }
    }
  }

  return PNG.sync.write(png);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets: { file: string; size: number; maskable?: boolean }[] = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
];

for (const t of targets) {
  const buffer = generateIcon(t.size, { maskable: t.maskable });
  writeFileSync(path.join(OUT_DIR, t.file), buffer);
  console.log(`Généré : icons/${t.file} (${t.size}x${t.size})`);
}
