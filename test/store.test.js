/**
 * The client data layer, themes and easter eggs.
 *
 * These modules are browser code, so the handful of globals they touch at
 * import time are stubbed here. That is a deliberately small surface —
 * `location`, `localStorage`, `document` — and if it ever has to grow much,
 * that is a signal the data layer has picked up a DOM dependency it should
 * not have.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location ??= { search: '', pathname: '/dashboard.html', href: '' };
globalThis.localStorage ??= (() => {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  };
})();

const { emptyData, store, RESET_CLEARS, RESET_KEEPS } = await import('../web/assets/js/core/store.js');
const { emptyData: serverEmpty } = await import('../server/lib/store.js');
const { PALETTES, DEFAULT_PALETTE, availablePalettes, paletteById } =
  await import('../web/assets/js/core/themes.js');
const { EGGS, eggFor, normalise } = await import('../web/assets/js/core/eggs.js');

/* ------------------------------------------------------------------ shape */

test('a fresh document carries every collection the app reads', () => {
  const d = emptyData();
  assert.equal(d.version, 3);
  for (const k of ['sessions', 'meals', 'weights', 'medals', 'friends',
    'checkIns', 'customFoods', 'unlocks']) {
    assert.ok(Array.isArray(d[k]), `${k} should be an array`);
  }
  for (const k of ['seasons', 'readiness', 'water']) {
    assert.equal(typeof d[k], 'object');
    assert.ok(!Array.isArray(d[k]), `${k} should be a map, not an array`);
  }
  assert.equal(d.settings.weighInEvery, 2, 'every other day out of the box');
  assert.equal(d.settings.checkpointEvery, 14);
  assert.equal(d.settings.palette, DEFAULT_PALETTE);
});

test('the server and the client agree on a fresh document', () => {
  // The two are written separately and have drifted before. An account that
  // looks different depending on whether an API happens to be running is the
  // exact failure this catches.
  const client = emptyData();
  const server = serverEmpty();
  assert.deepEqual(Object.keys(server).sort(), Object.keys(client).sort());
  assert.deepEqual(server.settings, client.settings);
  assert.deepEqual(server.profile.goals, client.profile.goals);
  assert.equal(server.version, client.version);
});

/* -------------------------------------------------------------- migration */

test('a v2 document upgrades without losing anything', async () => {
  const v2 = {
    version: 2,
    profile: { name: 'Old', goals: { kcal: 2700 } },
    onboarded: true,
    layout: 6,
    planStart: '2026-01-01',
    sessions: [{ id: 's1', date: '2026-05-01', name: 'Push', entries: [] }],
    meals: [{ id: 'm1', date: '2026-05-01', kcal: 600, p: 40, c: 50, f: 20 }],
    weights: [{ date: '2026-05-01', kg: 82 }, { date: '2026-05-08', kg: 81.2 }],
    medals: ['m-first'],
    friends: [],
    seasons: { summer: 'greek-fire' },
    readiness: { '2026-05-01': 7 },
  };
  localStorage.setItem('ferox.v2', JSON.stringify(v2));
  await store.init();

  const d = store.data;
  assert.equal(d.version, 3);
  assert.equal(d.onboarded, true, 'a migration must not send someone back through setup');
  assert.equal(d.layout, 6);
  assert.equal(d.planStart, '2026-01-01');
  assert.equal(d.sessions.length, 1);
  assert.deepEqual(d.seasons, { summer: 'greek-fire' });
  assert.equal(d.profile.goals.kcal, 2700);
  assert.equal(d.profile.goals.protein, 150, 'unset goals fall back to the default');

  // The old bodyweight series becomes check-ins, so the new charts have a
  // history on the first load rather than an empty card.
  assert.equal(d.checkIns.length, 2);
  assert.equal(d.checkIns[0].date, '2026-05-01');
  assert.equal(d.checkIns[1].weightKg, 81.2);
  assert.deepEqual(d.water, {});
  assert.deepEqual(d.unlocks, []);
});

test('a document full of the wrong types is coerced, not thrown away', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify({
    profile: { name: 'Broken' },
    sessions: 'nope', meals: null, checkIns: 3,
    seasons: [], readiness: 'x', water: null, unlocks: {},
    settings: { weighInEvery: 7 },
  }));
  await store.init();
  const d = store.data;
  for (const k of ['sessions', 'meals', 'checkIns', 'unlocks']) assert.deepEqual(d[k], []);
  for (const k of ['seasons', 'readiness', 'water']) assert.deepEqual(d[k], {});
  assert.equal(d.settings.weighInEvery, 7, 'a valid setting survives beside broken ones');
  assert.equal(d.settings.checkpointEvery, 14, 'and the missing ones get their defaults');
});

/* ------------------------------------------------------------- check-ins */

test('a check-in writes through to the bodyweight series and the profile', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();

  await store.logCheckIn({ date: '2026-09-01', weightKg: 84.2, bodyFat: 18.5, waistCm: 86 });
  assert.equal(store.data.checkIns.length, 1);
  assert.deepEqual(store.data.weights, [{ date: '2026-09-01', kg: 84.2 }],
    'the weight series is the single source of truth for bodyweight');
  assert.equal(store.data.profile.weightKg, 84.2, 'the plan reads weight off the profile');

  // Logging the same day again updates rather than duplicating.
  await store.logCheckIn({ date: '2026-09-01', weightKg: 84.0 });
  assert.equal(store.data.checkIns.length, 1);
  assert.equal(store.data.weights.length, 1);
  assert.equal(store.data.weights[0].kg, 84.0);
});

test('check-ins stay in date order however they are entered', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  for (const date of ['2026-09-10', '2026-09-02', '2026-09-06']) {
    await store.logCheckIn({ date, weightKg: 80 });
  }
  assert.deepEqual(store.data.checkIns.map(c => c.date),
    ['2026-09-02', '2026-09-06', '2026-09-10']);
});

test('nonsense measures are dropped rather than stored', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  const rec = await store.logCheckIn({
    date: '2026-09-01', weightKg: 80,
    bodyFat: 0, leanKg: -5, waistCm: NaN, restingHr: 'sixty', sleepH: 7.5,
  });
  assert.equal(rec.sleepH, 7.5);
  for (const k of ['bodyFat', 'leanKg', 'waistCm', 'restingHr']) {
    assert.equal(k in rec, false, `${k} should not be stored`);
  }
});

test('measure series skip the check-ins that omitted them', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  await store.logCheckIn({ date: '2026-09-01', weightKg: 80, bodyFat: 20 });
  await store.logCheckIn({ date: '2026-09-03', weightKg: 79.6 });
  await store.logCheckIn({ date: '2026-09-05', weightKg: 79.2, bodyFat: 19.4 });

  assert.equal(store.measureSeries('weightKg').length, 3);
  assert.equal(store.measureSeries('bodyFat').length, 2, 'a sparse measure charts only what it has');
  assert.equal(store.latestMeasure('bodyFat').value, 19.4);
  assert.equal(store.latestMeasure('waistCm'), null);
});

test('deleting a check-in takes its weigh-in with it', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  const rec = await store.logCheckIn({ date: '2026-09-01', weightKg: 80 });
  await store.removeCheckIn(rec.id);
  assert.deepEqual(store.data.checkIns, []);
  assert.deepEqual(store.data.weights, []);
});

/* ------------------------------------------------------------- scheduling */

test('the weigh-in prompt follows the cadence and asks once a day', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();

  assert.equal(store.weighInDue('2026-09-10').due, true, 'the first one is always due');

  await store.logCheckIn({ date: '2026-09-10', weightKg: 80 });
  assert.equal(store.weighInDue('2026-09-11').due, false, 'not due the next day on a 2-day cadence');
  assert.equal(store.weighInDue('2026-09-12').due, true);

  // Dismissing it stops the same day being asked again.
  await store.noteWeighInPrompt('2026-09-12');
  assert.equal(store.weighInDue('2026-09-12').due, false);
  assert.equal(store.weighInDue('2026-09-13').due, true, 'but tomorrow it asks again');

  await store.updateSettings({ weighInEvery: 0 });
  assert.equal(store.weighInDue('2026-10-30').due, false, 'zero turns the prompt off entirely');
});

/* ----------------------------------------------------------------- reset */

test('the full reset clears the stats and keeps the measurements', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();

  await store.updateProfile({ heightCm: 181, sex: 'male', age: 30 });
  await store.setSeason('summer', 'greek-fire');
  await store.logCheckIn({ date: '2026-09-01', weightKg: 84 });
  await store.addSession({ date: '2026-09-01', name: 'Push', entries: [] });
  await store.addMeal({ date: '2026-09-01', name: 'Oats', kcal: 400, p: 15, c: 60, f: 8 });
  await store.setReadiness(8, '2026-09-01');
  await store.logWater(500, '2026-09-01');
  await store.addCustomFood({ name: 'Nan bread', kcal: 300, p: 9, c: 50, f: 7 });
  await store.addFriend({ name: 'Sam', handle: 'sam' });
  await store.unlock('theme-pack');
  assert.ok(store.data.medals.length, 'a session should have earned at least one medal');

  await store.resetProgress();
  const d = store.data;

  // Gone.
  assert.deepEqual(d.sessions, []);
  assert.deepEqual(d.meals, []);
  assert.deepEqual(d.medals, []);
  assert.deepEqual(d.readiness, {});
  assert.deepEqual(d.water, {});
  assert.deepEqual(d.customFoods, []);

  // Kept.
  assert.equal(d.checkIns.length, 1, 'measurements survive a reset');
  assert.equal(d.weights.length, 1);
  assert.equal(d.profile.heightCm, 181);
  assert.deepEqual(d.seasons, { summer: 'greek-fire' });
  assert.equal(d.friends.length, 1);
  assert.deepEqual(d.unlocks, ['theme-pack']);
  assert.equal(d.onboarded, store.data.onboarded, 'setup is not undone');
});

test('the reset manifests describe what the reset actually does', () => {
  // The dialog lists these to the athlete, so they have to be non-empty and
  // must not claim to keep something the reset deletes.
  assert.ok(RESET_CLEARS.length >= 4 && RESET_KEEPS.length >= 4);
  const keeps = RESET_KEEPS.join(' ').toLowerCase();
  for (const word of ['session', 'meal', 'medal']) {
    assert.ok(!keeps.includes(word), `"${word}" is cleared but the keep list mentions it`);
  }
  assert.ok(RESET_KEEPS.some(k => /weigh|measure/i.test(k)));
  assert.ok(RESET_KEEPS.some(k => /season/i.test(k)));
});

test('the total wipe empties everything and un-onboards', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  await store.completeOnboarding({ profile: { sex: 'male' }, goals: {}, seasons: { summer: 'greek-fire' } });
  await store.logCheckIn({ date: '2026-09-01', weightKg: 84 });

  await store.reset();
  assert.equal(store.data.onboarded, false);
  assert.deepEqual(store.data.checkIns, []);
  assert.deepEqual(store.data.seasons, {});
});

/* ------------------------------------------------------------ custom food */

test('custom foods sit in front of the seed catalogue', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  const made = await store.addCustomFood({ name: 'Nan bread', per: '1', kcal: 300, p: 9, c: 50, f: 7 });
  assert.ok(made.id.startsWith('cf-'));
  assert.equal(made.custom, true);
  assert.equal(store.foodCatalogue()[0].id, made.id, 'your own foods should be easiest to reach');

  await store.removeCustomFood(made.id);
  assert.deepEqual(store.data.customFoods, []);
});

/* ----------------------------------------------------------------- water */

test('water accumulates and never goes negative', async () => {
  localStorage.setItem('ferox.v2', JSON.stringify(emptyData()));
  await store.init();
  await store.logWater(250, '2026-09-01');
  await store.logWater(500, '2026-09-01');
  assert.equal(store.waterFor('2026-09-01'), 750);
  await store.logWater(-1000, '2026-09-01');
  assert.equal(store.waterFor('2026-09-01'), 0);
  assert.equal(store.waterFor('2026-09-02'), 0, 'an unlogged day reads zero, not undefined');
});

/* ---------------------------------------------------------------- themes */

test('palettes are well formed and only ember is free', () => {
  const ids = PALETTES.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'palette ids must be unique');
  assert.equal(PALETTES.filter(p => !p.unlock).length, 1, 'exactly one palette is unlocked by default');
  assert.equal(PALETTES.find(p => !p.unlock).id, DEFAULT_PALETTE);

  for (const p of PALETTES) {
    assert.ok(p.name && p.hint, `${p.id} needs a name and a hint`);
    assert.equal(p.swatch.length, 3, `${p.id} needs three swatch colours`);
    for (const c of p.swatch) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
    for (const mode of ['dark', 'light']) {
      assert.match(p.themeColor[mode], /^#[0-9A-Fa-f]{6}$/, `${p.id} ${mode} theme-color`);
    }
  }
});

test('every palette has dark and light rules in the stylesheet', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../web/assets/css/ferox.css', import.meta.url), 'utf8');
  for (const p of PALETTES.filter(x => x.id !== DEFAULT_PALETTE)) {
    assert.ok(css.includes(`[data-palette='${p.id}']`), `${p.id} has no dark rules`);
    assert.ok(css.includes(`[data-palette='${p.id}'][data-theme='light']`), `${p.id} has no light mode`);
  }
});

test('locked palettes stay locked until the unlock is held', () => {
  assert.deepEqual(availablePalettes([]).map(p => p.id), [DEFAULT_PALETTE]);
  const open = availablePalettes(['theme-pack']).map(p => p.id);
  assert.ok(open.length > 1);
  for (const id of ['neon', 'cosmic', 'nautical']) assert.ok(open.includes(id), `${id} should unlock`);
});

test('an unknown palette id falls back rather than half-theming the page', () => {
  assert.equal(paletteById('does-not-exist').id, DEFAULT_PALETTE);
  assert.equal(paletteById(undefined).id, DEFAULT_PALETTE);
});

/* ------------------------------------------------------------------ eggs */

test('egg ids and phrases are unique', () => {
  const ids = EGGS.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const phrases = EGGS.flatMap(e => e.phrases.map(normalise));
  assert.equal(new Set(phrases).size, phrases.length, 'two eggs answer to the same phrase');
});

test('phrases match loosely — case, spaces and punctuation are forgiven', () => {
  const egg = eggFor('unleash the wolf');
  assert.equal(egg.id, 'theme-pack');
  for (const spelling of ['UNLEASH THE WOLF', 'Unleash  The   Wolf', 'unleash-the-wolf', '  unleashthewolf  ']) {
    assert.equal(eggFor(spelling)?.id, 'theme-pack', `"${spelling}" should work`);
  }
});

test('the theme unlock is reachable and points at the profile', () => {
  const egg = EGGS.find(e => e.id === 'theme-pack');
  assert.ok(egg, 'nothing unlocks the themes');
  assert.match(egg.goto, /^profile\.html/);
  assert.ok(egg.reveal.length > 20, 'an unlock should say what it did');
});

test('a miss returns nothing rather than guessing', () => {
  for (const miss of ['', '   ', null, undefined, 'hello', 'unleash the wolves']) {
    assert.equal(eggFor(miss), null, `"${miss}" should not match`);
  }
});

test('every egg has an id, a reveal and at least one phrase', () => {
  for (const e of EGGS) {
    assert.match(e.id, /^[a-z0-9-]+$/);
    assert.ok(e.phrases.length >= 1);
    assert.ok(e.title && e.reveal);
  }
});
