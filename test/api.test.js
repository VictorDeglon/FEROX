/** End-to-end checks against the real Express app, on an ephemeral port. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';

const dir = await mkdtemp(join(tmpdir(), 'ferox-test-'));
process.env.FEROX_DATA_DIR = dir;
process.env.JWT_SECRET = 'test-secret';

const { app } = await import('../server/index.js');
const { config } = await import('../server/config.js');

let server, base;
const token = jwt.sign({ sub: 'test:user', name: 'Tester' }, 'test-secret');
const get = (p, init) => fetch(base + p, init);
const auth = { authorization: `Bearer ${token}` };

before(async () => {
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(r => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

test('health reports status and google configuration', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.googleConfigured, 'boolean');
});

test('catalog serves reference data without auth', async () => {
  const body = await (await get('/api/catalog')).json();
  assert.ok(body.exercises.length > 0 && body.foods.length > 0);
  // Medal predicates are functions and must not survive JSON serialisation.
  assert.ok(body.medals.every(m => m.test === undefined), 'a predicate leaked into the API');
});

test('data endpoints reject missing and invalid tokens', async () => {
  assert.equal((await get('/api/data')).status, 401);
  assert.equal((await get('/api/data', { headers: { authorization: 'Bearer junk' } })).status, 401);
  assert.equal((await get('/api/data', { headers: { authorization: 'NotBearer x' } })).status, 401);
});

test('a new user starts with an empty, well-formed log', async () => {
  const body = await (await get('/api/data', { headers: auth })).json();
  assert.deepEqual(body.sessions, []);
  assert.equal(body.version, 3);
  assert.ok(body.profile.goals.kcal > 0);
  // The v3 collections have to exist, or the client renders an empty app.
  for (const k of ['checkIns', 'customFoods', 'unlocks']) assert.deepEqual(body[k], []);
  for (const k of ['seasons', 'readiness', 'water']) assert.deepEqual(body[k], {});
  assert.equal(body.settings.weighInEvery, 2, 'every other day is the default cadence');
});

test('data round-trips through a PUT', async () => {
  const payload = {
    profile: { name: 'Tester', goals: { kcal: 3000 } },
    sessions: [{ id: 's1', date: '2026-09-29', name: 'Push', entries: [] }],
    meals: [], weights: [], medals: ['m-first'], friends: [],
  };
  const put = await get('/api/data', { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  assert.equal(put.status, 200);
  assert.deepEqual((await put.json()).counts.sessions, 1);

  const back = await (await get('/api/data', { headers: auth })).json();
  assert.equal(back.sessions[0].name, 'Push');
  assert.equal(back.profile.goals.kcal, 3000);
  assert.equal(back.profile.goals.protein, 150, 'missing goals should fall back to defaults');
  assert.deepEqual(back.medals, ['m-first']);
});

test('a PUT keeps the whole document, not a whitelist of it', async () => {
  // This is the regression that mattered: the old route rebuilt the document
  // from a fixed list of keys, so onboarding, seasons, readiness and the plan
  // start date were deleted on every save and setup ran again on every device.
  const payload = {
    profile: { name: 'Tester' },
    onboarded: true,
    layout: 6,
    planStart: '2026-01-04',
    readiness: { '2026-09-28': 8 },
    seasons: { summer: 'greek-fire' },
    water: { '2026-09-28': 2000 },
    checkIns: [{ id: 'c1', date: '2026-09-28', weightKg: 81.4, bodyFat: 17.2 }],
    customFoods: [{ id: 'cf-1', name: 'Nan bread', per: '1', kcal: 300, p: 9, c: 50, f: 7 }],
    unlocks: ['theme-pack'],
    settings: { weighInEvery: 7, palette: 'cosmic' },
    sessions: [], meals: [], weights: [], medals: [], friends: [],
  };
  const put = await get('/api/data', {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(put.status, 200);

  const back = await (await get('/api/data', { headers: auth })).json();
  assert.equal(back.onboarded, true, 'onboarding flag was dropped');
  assert.equal(back.layout, 6);
  assert.equal(back.planStart, '2026-01-04');
  assert.deepEqual(back.seasons, { summer: 'greek-fire' });
  assert.deepEqual(back.readiness, { '2026-09-28': 8 });
  assert.deepEqual(back.water, { '2026-09-28': 2000 });
  assert.equal(back.checkIns[0].bodyFat, 17.2);
  assert.equal(back.customFoods[0].name, 'Nan bread');
  assert.deepEqual(back.unlocks, ['theme-pack']);
  assert.equal(back.settings.weighInEvery, 7);
  assert.equal(back.settings.palette, 'cosmic');
  assert.equal(back.settings.checkpointEvery, 14, 'unset settings still get their default');
});

test('a PUT cannot poison the prototype chain', async () => {
  const res = await get('/api/data', {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: '{"__proto__":{"polluted":true},"sessions":[],"meals":[],"weights":[],"medals":[],"friends":[]}',
  });
  assert.equal(res.status, 200);
  assert.equal({}.polluted, undefined, 'Object.prototype was polluted by a PUT');
});

test('PUT rejects a non-object body and coerces bad collections', async () => {
  const bad = await get('/api/data', { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify([1, 2]) });
  assert.equal(bad.status, 400);

  const coerced = await get('/api/data', {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ sessions: 'not-an-array', meals: null, checkIns: 7, seasons: [], water: 'no' }),
  });
  assert.equal(coerced.status, 200);
  const back = await (await get('/api/data', { headers: auth })).json();
  assert.deepEqual(back.sessions, [], 'a bad collection should become an empty array, not crash');
  assert.deepEqual(back.checkIns, []);
  assert.deepEqual(back.seasons, {}, 'an array where a map belongs should become an empty map');
  assert.deepEqual(back.water, {});
});

test('one user cannot read another user log', async () => {
  const other = jwt.sign({ sub: 'someone:else' }, 'test-secret');
  const body = await (await get('/api/data', { headers: { authorization: `Bearer ${other}` } })).json();
  assert.deepEqual(body.sessions, [], 'saw another users sessions');
});

test('a token signed with the wrong secret is refused', async () => {
  const forged = jwt.sign({ sub: 'test:user' }, 'not-the-secret');
  assert.equal((await get('/api/data', { headers: { authorization: `Bearer ${forged}` } })).status, 401);
});

test('google sign-in reports 501 when no client id is configured', async () => {
  assert.equal(config.googleClientId, '');
  const res = await get('/api/auth/google', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credential: 'anything' }),
  });
  assert.equal(res.status, 501);
});

test('google sign-in validates its input shape', async () => {
  const res = await get('/api/auth/google', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

test('unknown api routes 404 as json, not as the html app', async () => {
  const res = await get('/api/nope');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /json/);
});

test('the web app is served from the same origin', async () => {
  assert.equal((await get('/')).status, 200);
  assert.equal((await get('/assets/css/ferox.css')).status, 200);
  assert.equal((await get('/nope.html')).status, 404);
});
