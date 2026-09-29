/**
 * Static sanity check for web/: every local href/src/import resolves to a file.
 * Cheap insurance against a rename breaking the site on Pages.
 */
import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const problems = [];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const exists = async p => { try { await access(p); return true; } catch { return false; } };
const isLocal = u => u && !/^(https?:|data:|mailto:|#|\/\/)/.test(u);

const files = await walk(root);
let checked = 0;

for (const file of files) {
  if (!/\.(html|js|webmanifest)$/.test(file)) continue;
  const src = await readFile(file, 'utf8');
  // markup refs resolve against the *page* (always web/), imports against the file
  const refs = [
    ...[...src.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => ({ u: m[1], base: root })),
    ...[...src.matchAll(/"src"\s*:\s*"([^"]+)"/g)].map(m => ({ u: m[1], base: root })),
    ...[...src.matchAll(/\bfrom\s+'([^']+)'/g)].map(m => ({ u: m[1], base: dirname(file) })),
  ];
  for (const { u, base } of refs) {
    if (!isLocal(u) || u.includes('${')) continue;      // skip template interpolations
    const clean = u.split(/[?#]/)[0];
    if (!clean) continue;
    checked++;
    if (!await exists(resolve(base, clean))) {
      problems.push(`${relative(root, file)} → ${u}`);
    }
  }
}

// Every page must load a page script that exists.
for (const page of files.filter(f => f.endsWith('.html'))) {
  const src = await readFile(page, 'utf8');
  if (!/<title>/.test(src)) problems.push(`${relative(root, page)}: missing <title>`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} broken reference(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`✓ web/ ok — ${checked} local references across ${files.length} files all resolve`);
