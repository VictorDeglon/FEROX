/**
 * Zero-dependency static server for ../web — what GitHub Pages will do, locally.
 * Use this to check the site exactly as it will be deployed, with no API around.
 *
 *   npm run web     # http://localhost:5173
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const port = Number(process.env.PORT ?? 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (rel.endsWith('/')) rel += 'index.html';

  let file = join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    if (!extname(file)) file += '.html';      // /dashboard -> /dashboard.html
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch {
    try {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(await readFile(join(root, '404.html')));
    } catch { res.writeHead(404).end('Not found'); }
  }
}).listen(port, () => console.log(`FEROX web  →  http://localhost:${port}`));
