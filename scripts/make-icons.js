#!/usr/bin/env node
/**
 * Derive every square app icon from the mascot art.
 *
 *   node scripts/make-icons.js            # from web/assets/brand/mascot.png
 *   node scripts/make-icons.js art.png    # from somewhere else
 *
 * The icons used to be centre crops of the mascot, which cut its ears off at
 * the top and its ruff at the sides — the head is portrait, the icon is square,
 * and cropping is the one operation that cannot square a portrait without
 * losing something. Every icon here is *fitted* instead: the whole silhouette
 * goes in and the leftover space is brand-dark, which reads as a badge rather
 * than as a mistake.
 *
 * Run it whenever the mascot changes. `scripts/add-mascot.js` calls it for you.
 */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { decodePng, encodePng, alphaBounds, crop, square } from './lib/png.js';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'web', 'assets', 'brand');

/** Matches --bg / background_color in the manifest and the favicon plate. */
const PLATE = '#0A0B0D';

/*
 * `scale` is how much of the square the artwork fills.
 *  - 1.00 for the transparent marks: they sit on whatever the UI is already
 *    painting, so padding is wasted pixels.
 *  - 0.88 on the plated icons: a touch of margin inside the rounded corner
 *    platforms draw for us.
 *  - 0.62 for the maskable: Android may crop to a circle inscribed in the
 *    middle 80%, so the art has to survive losing everything outside it.
 */
const TARGETS = [
  { file: 'icon.png',             size: 512, scale: 1,    background: null },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.88, background: PLATE },
  { file: 'favicon-32.png',       size: 32,  scale: 0.94, background: PLATE },
  { file: 'maskable.png',         size: 512, scale: 0.62, background: PLATE },
];

const src = process.argv[2] ?? join(brand, 'mascot.png');
let img;
try {
  img = decodePng(await readFile(src));
} catch (err) {
  console.error(`✗ cannot read ${basename(src)}: ${err.message}`);
  console.error('  Expected an 8-bit non-interlaced PNG — `sips -s format png <file>` will make one.');
  process.exit(1);
}
console.log(`source  ${basename(src)}  ${img.width}×${img.height}`);

/*
 * Trim first. The generated art carries transparent margin, and a fit honours
 * that margin as if it were part of the drawing — the head would land small and
 * off-centre inside every icon for no reason.
 */
const box = alphaBounds(img);
if (box && (box.width < img.width || box.height < img.height)) {
  img = crop(img, box);
  console.log(`trim    → ${img.width}×${img.height} (dropped transparent margin)`);
}

for (const { file, size, scale, background } of TARGETS) {
  const out = square(img, size, { background, scale });
  await writeFile(join(brand, file), encodePng(out));
  const { size: bytes } = await stat(join(brand, file));
  console.log(`wrote   ${file.padEnd(22)} ${size}×${size}  ` +
              `${background ? 'on ' + PLATE : 'transparent'}  ${(bytes / 1024).toFixed(0)} KB`);
}

/* WebP for the one icon the app actually fetches on every page load. */
try {
  await run('cwebp', ['-q', '90', '-alpha_q', '100', '-quiet',
    join(brand, 'icon.png'), '-o', join(brand, 'icon.webp')]);
  const png = await stat(join(brand, 'icon.png'));
  const webp = await stat(join(brand, 'icon.webp'));
  console.log(`wrote   ${'icon.webp'.padEnd(22)} ${(webp.size / 1024).toFixed(0)} KB` +
              `  (${Math.round((1 - webp.size / png.size) * 100)}% smaller than the png)`);
} catch {
  console.log('note    cwebp not installed — icon.webp left as it was.');
  console.log('        `brew install webp` then re-run so the chrome mark stays in step.');
}

console.log('\nDone. Bump CACHE in web/sw.js so installed clients pick the new icons up.');
