/**
 * Parse every module in web/ with Node.
 *
 * The app has no build step, so nothing else ever reads these files before a
 * browser does. `node --check` is the cheapest possible stand-in for that
 * first load, and it catches the class of mistake — a stray brace, a typo in
 * an export — that would otherwise ship as a blank page.
 */
import { readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = await walk(root);
const broken = [];

for (const file of files) {
  try { await run(process.execPath, ['--check', file]); }
  catch (err) { broken.push(`${relative(root, file)}\n    ${String(err.stderr).trim().split('\n')[0]}`); }
}

if (broken.length) {
  console.error(`✗ ${broken.length} module(s) do not parse:`);
  for (const b of broken) console.error('  ' + b);
  process.exit(1);
}
console.log(`✓ ${files.length} modules in web/ parse cleanly`);
