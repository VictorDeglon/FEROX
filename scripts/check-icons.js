#!/usr/bin/env node
/**
 * Measure every app icon and fail if the art touches an edge.
 *
 * This has gone wrong twice. The first time the icons were centre *crops* of a
 * portrait mascot, so the ears were genuinely cut off. The fix was to fit
 * instead of crop — but `icon.png` was fitted at scale 1.00, and fitting a
 * 816×1024 head into a square fills the height exactly, leaving zero rows
 * above the ears. Nothing was cropped and it still looked cropped, which is
 * the sort of bug that survives a careful look at the source.
 *
 * So it is measured instead of eyeballed. Ink is any pixel that differs from
 * the corner colour (or any opaque pixel, where the corner is transparent).
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png.js';

const brand = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'assets', 'brand');

/** Smallest acceptable margin, as a fraction of the icon's width. */
const MIN = {
  'icon.png': 0.04,
  'apple-touch-icon.png': 0.04,
  'favicon-48.png': 0.04,
  'favicon-32.png': 0.04,
  'favicon-16.png': 0.04,
  'maskable.png': 0.17,          // Android's safe zone is far stricter
};

function margins(img) {
  const { width: w, height: h, data: d } = img;
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const bg = px(0, 0);
  const ink = (x, y) => {
    const [r, g, b, a] = px(x, y);
    if (a < 8) return false;
    if (bg[3] < 8) return true;
    return Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) > 30;
  };
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) return null;
  return { l: minX, r: w - 1 - maxX, t: minY, b: h - 1 - maxY, w, h };
}

const problems = [];
for (const [file, min] of Object.entries(MIN)) {
  const m = margins(decodePng(await readFile(join(brand, file))));
  if (!m) { problems.push(`${file}: no artwork found`); continue; }

  const need = Math.round(m.w * min);
  const worst = Math.min(m.l, m.r, m.t, m.b);
  const pct = v => `${(v / m.w * 100).toFixed(1)}%`;
  const line = `${file.padEnd(22)} ${m.w}×${m.h}  L${m.l} R${m.r} T${m.t} B${m.b}  `
             + `(min ${pct(worst)}, need ${pct(need)})`;

  if (worst < need) {
    const sides = [m.l === worst && 'left', m.r === worst && 'right',
      m.t === worst && 'top', m.b === worst && 'bottom'].filter(Boolean).join('/');
    problems.push(`${line}  <-- too tight on ${sides}`);
  } else {
    console.log(`  ✓ ${line}`);
  }

  // Lopsided art reads as a mistake even when nothing is clipped. One pixel
  // of slack is not lopsided, it is an odd number of leftover pixels being
  // split between two sides — at 32px that is unavoidable and harmless.
  const skewX = Math.abs(m.l - m.r), skewY = Math.abs(m.t - m.b);
  if (Math.max(skewX, skewY) > Math.max(1, m.w * 0.03)) {
    problems.push(`${file.padEnd(22)} off-centre by ${skewX}px across, ${skewY}px down`);
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} icon problem(s):`);
  for (const p of problems) console.error('  ' + p);
  console.error('\n  Adjust `scale` in scripts/make-icons.js and re-run it.');
  process.exit(1);
}
console.log(`✓ all ${Object.keys(MIN).length} icons clear their edges`);
