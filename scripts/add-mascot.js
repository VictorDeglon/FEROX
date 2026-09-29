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
import { copyFile, stat, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'web', 'assets', 'brand');

const ALLOWED = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg']);
const MAX_KB = 400;
const MAX_EDGE = 1024;   // plenty for a 320px slot on a 2x display


/**
 * Bounding box of pixels with meaningful alpha in an 8-bit RGBA PNG.
 * Generators pad their output with transparent margin; shipping that means the
 * artwork renders smaller than its box for no reason. Read-only — the actual
 * crop is left to sips, so nothing here has to re-encode a PNG.
 */
async function alphaBounds(file) {
  const buf = await readFile(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;

  let pos = 8, idat = [], width = 0, height = 0, depth = 0, colour = 0;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      depth = buf[pos + 16];
      colour = buf[pos + 17];
    } else if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (colour !== 6 || depth !== 8) return null;   // only truecolour+alpha

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = width * bpp;
  let prev = Buffer.alloc(stride), i = 0;
  let minX = width, maxX = -1, minY = height, maxY = -1;

  for (let y = 0; y < height; y++) {
    const filter = raw[i++];
    const line = Buffer.from(raw.subarray(i, i + stride));
    i += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      if (filter === 1) line[x] = (line[x] + a) & 255;
      else if (filter === 2) line[x] = (line[x] + b) & 255;
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    for (let x = 0; x < width; x++) {
      if (line[x * bpp + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    prev = line;
  }
  return maxX < 0 ? null : { width, height, minX, maxX, minY, maxY };
}

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/add-mascot.js <path-to-image>');
  console.error('see docs/mascot-prompts.md for prompts that match the brand.');
  process.exit(1);
}

let ext = extname(src).toLowerCase();
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
console.log(`source  ${basename(src)}  ${(info.size / 1024).toFixed(0)} KB`);

/*
 * Image generators routinely hand you a `.svg` that is really a single <image>
 * wrapping a base64 PNG — vector extension, raster content. Unwrap it, because
 * shipping the wrapper means shipping ~33% base64 overhead and a file that
 * cannot be resized or re-encoded.
 */
let working = src;
if (ext === '.svg') {
  const text = await readFile(src, 'utf8');
  const m = text.match(/(?:xlink:)?href="data:image\/(png|jpeg|webp);base64,([^"]+)"/);
  if (m) {
    ext = m[1] === 'jpeg' ? '.jpg' : `.${m[1]}`;
    working = join(tmpdir(), `ferox-mascot${ext}`);
    await writeFile(working, Buffer.from(m[2], 'base64'));
    const un = await stat(working);
    console.log(`unwrap  the .svg wraps a ${m[1]} — extracted ${(un.size / 1024).toFixed(0)} KB of pixels`);
  } else if (/<(path|polygon|circle|rect)\b/.test(text)) {
    console.log('note    real vector artwork — copying as-is, no re-encoding needed');
  } else {
    console.error('✗ that .svg has neither an embedded raster nor any drawable shapes.');
    process.exit(1);
  }
}

/* Trim transparent margin and cap the long edge. macOS only; skipped elsewhere. */
if (ext !== '.svg') {
  const staged = join(tmpdir(), `ferox-mascot-staged${ext}`);
  await copyFile(working, staged);
  try {
    // Crop away transparent padding first. sips crops from the centre, so take
    // the smaller margin on each axis — that never clips real pixels.
    const box = ext === '.png' ? await alphaBounds(staged).catch(() => null) : null;
    if (box) {
      const padX = Math.min(box.minX, box.width - 1 - box.maxX);
      const padY = Math.min(box.minY, box.height - 1 - box.maxY);
      if (padX > 2 || padY > 2) {
        const cw = box.width - 2 * padX, chh = box.height - 2 * padY;
        await run('sips', ['--cropToHeightWidth', String(chh), String(cw), staged]);
        console.log(`trim    ${box.width}×${box.height} → ${cw}×${chh} (dropped transparent padding)`);
      }
    }

    const { stdout } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', staged]);
    const w = Number(stdout.match(/pixelWidth: (\d+)/)?.[1]);
    const h = Number(stdout.match(/pixelHeight: (\d+)/)?.[1]);
    if (Math.max(w, h) > MAX_EDGE) {
      await run('sips', ['-Z', String(MAX_EDGE), staged]);
      const { stdout: after } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', staged]);
      console.log(`resize  ${w}×${h} → ${after.match(/pixelWidth: (\d+)/)[1]}×${after.match(/pixelHeight: (\d+)/)[1]}`);
    } else {
      console.log(`size    ${w}×${h} — already within ${MAX_EDGE}px`);
    }
    working = staged;
  } catch {
    console.log('note    sips unavailable — shipping at the original resolution');
  }
}

const target = join(brand, `mascot${ext}`);
await copyFile(working, target);
console.log(`copied  web/assets/brand/${basename(target)}`);

/* WebP is usually 25–40% smaller at the same quality. Optional — skip quietly. */
const assets = [`assets/brand/${basename(target)}`];
if (ext !== '.webp') {
  const webp = join(brand, 'mascot.webp');
  try {
    // -alpha_q 100 keeps the cut-out edge crisp; lossy alpha fringes badly
    // against a dark page, which is exactly where this asset gets used.
    await run('cwebp', ['-q', '86', '-alpha_q', '100', '-quiet', target, '-o', webp]);
    const w = await stat(webp);
    const png = await stat(target);
    console.log(`encoded web/assets/brand/mascot.webp  ${(w.size / 1024).toFixed(0)} KB` +
                `  (${Math.round((1 - w.size / png.size) * 100)}% smaller than the png)`);
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

const shipped = await stat(assets[0].endsWith('.webp') ? join(brand, 'mascot.webp') : target);
const kb = shipped.size / 1024;
if (kb > MAX_KB) {
  console.log(`\n⚠  ${kb.toFixed(0)} KB is heavy for the asset browsers will actually fetch.`);
  console.log('   Re-run with a smaller source, or drop cwebp quality in this script.');
} else {
  console.log(`\nbrowsers fetch ${(assets[0])} — ${kb.toFixed(0)} KB`);
}

console.log('\nDone. The landing page and 404 page pick it up automatically.');
console.log('Check it with:  npm run web   →  http://localhost:5173');
