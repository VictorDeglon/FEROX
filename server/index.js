/**
 * FEROX API + static host.
 *
 * Entirely optional: the web app in ../web runs without it. Start this when you
 * want verified Google sign-in and a log that follows you between devices.
 *
 *   npm start           # http://localhost:4000
 */
import express from 'express';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { dataRouter } from './routes/data.js';
import { EXERCISES, ROUTINES, FOODS, MEDALS } from '../web/assets/js/core/seed.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));

/* CORS — the web app may be served from GitHub Pages while the API runs here. */
app.use((req, res, next) => {
  const allowed = config.corsOrigin;
  const origin = req.get('origin');
  if (allowed === '*') res.set('access-control-allow-origin', '*');
  else if (origin && allowed.split(',').map(s => s.trim()).includes(origin)) {
    res.set('access-control-allow-origin', origin);
    res.set('vary', 'Origin');
  }
  res.set('access-control-allow-headers', 'content-type, authorization');
  res.set('access-control-allow-methods', 'GET, PUT, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => res.json({
  ok: true,
  version: 2,
  googleConfigured: Boolean(config.googleClientId),
}));

/* Reference data — the client ships its own copy, this is for other clients. */
app.get('/api/catalog', (req, res) => res.json({
  exercises: EXERCISES,
  routines: ROUTINES,
  foods: FOODS,
  medals: MEDALS.map(({ test, ...rest }) => rest),   // predicates aren't serialisable
}));

app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'No such endpoint' }));

/* Serve the web app from the same origin, so no CORS and no config needed. */
app.use(express.static(config.webRoot, { extensions: ['html'], maxAge: '1h' }));
app.use((req, res) => res.status(404).sendFile('404.html', { root: config.webRoot }));

app.use((err, req, res, _next) => {
  const status = err.status ?? 500;
  // Deliberate failures (401, 501 "not configured") carry a status and need no
  // stack trace; anything without one is a genuine surprise worth the noise.
  if (err.status === undefined) console.error('[ferox]', err);
  else if (status >= 500) console.warn(`[ferox] ${status}: ${err.message}`);
  res.status(status).json({ error: err.message ?? 'Server error' });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(config.port, () => {
    console.log(`FEROX  →  http://localhost:${config.port}`);
    console.log(`  web    ${config.webRoot}`);
    console.log(`  data   ${config.dataDir}`);
    console.log(`  google ${config.googleClientId ? 'configured' : 'NOT configured (guest mode only)'}`);
  });
}

export { app };
