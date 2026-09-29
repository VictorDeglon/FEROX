#!/usr/bin/env node
/**
 * Wire a generated mascot image into FEROX.
 *
 *   node scripts/add-mascot.js ~/Downloads/wolf.png
 *
 * Copies it into web/assets/brand/, makes a WebP alongside it when `cwebp` is
 * available, registers both in the service worker shell and bumps the cache
 * version so existing installs pick it up. The landing page and 404 page probe
 * for the file at runtime, so nothing else needs editing.
 */
import { copyFile, stat, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'web', 'assets', 'brand');

const ALLOWED = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const MAX_MB = 1.5;

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/add-mascot.js <path-to-image>');
  console.error('see docs/mascot-prompts.md for prompts that match the brand.');
  process.exit(1);
}

const ext = extname(src).toLowerCase();
if (!ALLOWED.has(ext)) {
  console.error(`✗ ${basename(src)} is a ${ext || 'file with no extension'}.`);
  console.error(`  Expected one of: ${[...ALLOWED].join(', ')}`);
  process.exit(1);
}

let info;
try {
  info = await stat(src);
} catch {
  console.error(`✗ no such file: ${src}`);
  process.exit(1);
}

const mb = info.size / 1024 / 1024;
console.log(`source  ${basename(src)}  ${mb.toFixed(2)} MB`);

const target = join(brand, `mascot${ext === '.jpeg' ? '.jpg' : ext}`);
await copyFile(src, target);
console.log(`copied  web/assets/brand/${basename(target)}`);

/* WebP is usually 25–40% smaller at the same quality. Optional — skip quietly. */
const assets = [`assets/brand/${basename(target)}`];
if (ext !== '.webp') {
  const webp = join(brand, 'mascot.webp');
  try {
    await run('cwebp', ['-q', '82', '-quiet', target, '-o', webp]);
    const w = await stat(webp);
    console.log(`encoded web/assets/brand/mascot.webp  ${(w.size / 1024 / 1024).toFixed(2)} MB` +
                `  (${Math.round((1 - w.size / info.size) * 100)}% smaller)`);
    assets.unshift('assets/brand/mascot.webp');
  } catch {
    console.log('note    cwebp not installed — shipping the original only.');
    console.log('        `brew install webp` then re-run to halve the transfer size.');
  }
}

/* Register in the service worker so the mascot is available offline. */
const swPath = join(root, 'web', 'sw.js');
let sw = await readFile(swPath, 'utf8');
let added = 0;
for (const a of assets) {
  if (sw.includes(`'${a}'`)) continue;
  sw = sw.replace("  'assets/brand/favicon.svg',", `  '${a}',\n  'assets/brand/favicon.svg',`);
  added++;
}
if (added) {
  sw = sw.replace(/const CACHE = 'ferox-v(\d+)\.(\d+)\.(\d+)';/,
    (_, maj, min, patch) => `const CACHE = 'ferox-v${maj}.${Number(min) + 1}.0';`);
  await writeFile(swPath, sw);
  const version = sw.match(/const CACHE = '([^']+)'/)[1];
  console.log(`cached  ${added} file(s) in the service worker, bumped to ${version}`);
} else {
  console.log('cached  already registered in the service worker');
}

if (mb > MAX_MB) {
  console.log(`\n⚠  ${mb.toFixed(2)} MB is heavy for a web asset. Shrink it with:`);
  console.log(`   sips -Z 1024 "${target}"`);
}

console.log('\nDone. The landing page and 404 page pick it up automatically.');
console.log('Check it with:  npm run web   →  http://localhost:5173');
