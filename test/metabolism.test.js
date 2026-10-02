/**
 * The maths behind the adaptive checkpoints.
 *
 * Everything in core/metabolism.js is pure — it takes a data document and
 * returns numbers — so it runs under node with no DOM and no stubbing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weightTrend, intakeOver, adherence, estimateMaintenance, expectedRate,
  checkpoints, nextCheckpoint, lastJudged, suggestAdjustment, describeFactor,
  bodyFatFromLean, leanFromBodyFat, KCAL_PER_KG,
} from '../web/assets/js/core/metabolism.js';

const DAY = 864e5;
const iso = t => new Date(t).toISOString().slice(0, 10);
const TODAY = '2026-09-29';
const back = n => iso(Date.parse(TODAY) - n * DAY);

/** A log with `days` of weigh-ins on a given kg/day slope and a flat intake. */
function log({ days = 42, startKg = 85, perDay = 0, kcal = 2500, logEvery = 1, settings = {} } = {}) {
  const checkIns = [];
  const meals = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = back(i);
    checkIns.push({ id: `c${i}`, date, weightKg: +(startKg + perDay * (days - 1 - i)).toFixed(2) });
    if (i % logEvery === 0) meals.push({ id: `m${i}`, date, kcal, p: 0, c: 0, f: 0 });
  }
  return {
    profile: { sex: 'male', age: 30, heightCm: 180, weightKg: startKg, activity: 3,
      goals: { kcal, protein: 170, carbs: 250, fat: 70 } },
    planStart: back(days - 1),
    meals, checkIns, sessions: [],
    settings: { checkpointEvery: 14, ...settings },
  };
}

/* ------------------------------------------------------------------- trend */

test('the weight trend is a regression, not first-versus-last', () => {
  // Falling half a kilo a week overall, but the last reading spikes on water.
  const series = [
    { date: back(28), value: 85.0 }, { date: back(21), value: 84.5 },
    { date: back(14), value: 84.0 }, { date: back(7), value: 83.5 },
    { date: back(0), value: 84.4 },
  ];
  const t = weightTrend(series);
  assert.ok(t.perWeek < 0, `a spiking last reading flipped the trend: ${t.perWeek}`);
  assert.equal(t.points, 5);
  assert.equal(t.spanDays, 28);
});

test('a trend needs two points on different days', () => {
  assert.equal(weightTrend([]), null);
  assert.equal(weightTrend([{ date: back(1), value: 80 }]), null);
  assert.equal(weightTrend([{ date: back(1), value: 80 }, { date: back(1), value: 81 }]), null,
    'every reading on one day has no slope');
});

test('a perfectly linear series recovers its own slope', () => {
  const series = Array.from({ length: 15 }, (_, i) => ({ date: back(14 - i), value: 90 - i * 0.1 }));
  const t = weightTrend(series);
  assert.ok(Math.abs(t.perDay + 0.1) < 1e-9, `expected -0.1 kg/day, got ${t.perDay}`);
  assert.ok(Math.abs(t.perWeek + 0.7) < 1e-9);
});

/* ------------------------------------------------------------------ intake */

test('intake averages logged days and reports how much of the window they cover', () => {
  const d = log({ days: 14, kcal: 2000, logEvery: 2 });
  const i = intakeOver(d, back(13), TODAY);
  assert.equal(i.mean, 2000, 'the mean is over logged days, not elapsed ones');
  assert.equal(i.loggedDays, 7);
  assert.ok(Math.abs(i.coverage - 0.5) < 0.01);
});

test('an empty window reports nothing rather than dividing by zero', () => {
  const i = intakeOver({ meals: [] }, back(13), TODAY);
  assert.deepEqual([i.mean, i.loggedDays, i.coverage], [0, 0, 0]);
});

/* --------------------------------------------------------------- adherence */

test('adherence separates logging from hitting the target', () => {
  const d = log({ days: 28, kcal: 2500 });
  d.profile.goals.kcal = 2500;
  const a = adherence(d, 28, TODAY);
  assert.equal(a.loggedDays, 28);
  assert.equal(a.onTargetDays, 28);
  assert.ok(a.score > 0.99, `perfect logging and hitting should score ~1, got ${a.score}`);

  // Same days logged, every one of them 40% over target.
  const over = log({ days: 28, kcal: 3500 });
  over.profile.goals.kcal = 2500;
  const b = adherence(over, 28, TODAY);
  assert.equal(b.loggedDays, 28);
  assert.equal(b.onTargetDays, 0);
  assert.equal(b.overDays, 28);
  assert.ok(b.score < 0.45, 'logging alone should not earn a good score');
});

test('logging nothing scores zero without throwing', () => {
  const a = adherence({ meals: [], profile: { goals: { kcal: 2400 } } }, 28, TODAY);
  assert.equal(a.score, 0);
  assert.equal(a.onTarget, 0);
});

/* -------------------------------------------------------------- estimation */

test('maintenance falls back to the prediction until there is data', () => {
  const thin = log({ days: 5, kcal: 2500 });
  const e = estimateMaintenance(thin, 2600, { today: TODAY });
  assert.equal(e.confidence, 'none');
  assert.equal(e.kcal, 2600, 'too little data must not move the number');
  assert.equal(e.factor, 1);
});

test('a steady deficit recovers a maintenance above the intake', () => {
  // 2,500 kcal a day while losing 0.5 kg a week implies roughly
  // 2,500 + (0.5 * 7700 / 7) = 3,050 kcal of maintenance.
  const d = log({ days: 42, kcal: 2500, perDay: -0.5 / 7 });
  const e = estimateMaintenance(d, 3000, { today: TODAY });
  assert.equal(e.confidence, 'good');
  assert.ok(e.kcal > 2900 && e.kcal < 3200, `expected ~3,050, got ${e.kcal}`);
  assert.ok(e.rawEstimate > 3000);
});

test('a gain on a known intake reads as a maintenance below it', () => {
  const d = log({ days: 42, kcal: 3200, perDay: 0.25 / 7 });
  const e = estimateMaintenance(d, 3200, { today: TODAY });
  assert.ok(e.kcal < 3200, `gaining weight at 3,200 kcal means maintenance is under it, got ${e.kcal}`);
});

test('a wild estimate is clamped rather than prescribed', () => {
  // 900 kcal a day logged against a stable weight — a logging artefact, not a
  // 900 kcal metabolism. The clamp is what stops the app acting on it.
  const d = log({ days: 42, kcal: 900, perDay: 0 });
  const e = estimateMaintenance(d, 2800, { today: TODAY });
  assert.equal(e.clamped, true);
  assert.ok(e.kcal >= 2800 * 0.7, `clamped estimate dropped too far: ${e.kcal}`);
});

test('patchy logging is trusted less than complete logging', () => {
  const PREDICTED = 3000;
  const full = estimateMaintenance(log({ days: 42, kcal: 2200, perDay: -0.5 / 7 }), PREDICTED, { today: TODAY });
  const patchy = estimateMaintenance(log({ days: 42, kcal: 2200, perDay: -0.5 / 7, logEvery: 4 }), PREDICTED, { today: TODAY });
  assert.equal(full.confidence, 'good');
  assert.equal(patchy.confidence, 'low');

  // Both read the same underlying story, so they point the same way. The
  // low-confidence one is blended back toward the equation, which puts it
  // strictly between the prediction and the number the data alone implies.
  assert.ok(full.kcal < PREDICTED, 'this log implies a maintenance under the prediction');
  assert.ok(patchy.kcal > full.kcal, 'a low-confidence estimate should be pulled toward the prediction');
  assert.ok(patchy.kcal < PREDICTED, 'but should still move in the direction the data points');
});

test('describeFactor covers the whole range in plain words', () => {
  for (const f of [0.8, 0.94, 1, 1.05, 1.2]) {
    assert.equal(typeof describeFactor(f), 'string');
    assert.ok(describeFactor(f).length > 8);
  }
  assert.notEqual(describeFactor(0.8), describeFactor(1.2));
});

/* ------------------------------------------------------------------- rates */

test('the expected rate follows the calorie gap and is capped at 1% a week', () => {
  const steady = expectedRate({ targetKcal: 2500, maintenanceKcal: 2500, weightKg: 80 });
  assert.equal(steady, 0, 'eating at maintenance should predict no change');

  const cut = expectedRate({ targetKcal: 2000, maintenanceKcal: 2500, weightKg: 80 });
  assert.ok(Math.abs(cut + (500 * 7) / KCAL_PER_KG) < 1e-9);

  const crash = expectedRate({ targetKcal: 800, maintenanceKcal: 3500, weightKg: 80 });
  assert.equal(crash, -0.8, 'a huge deficit is capped at 1% of bodyweight a week');
});

test('poor adherence scales the expected rate down', () => {
  const full = expectedRate({ targetKcal: 2000, maintenanceKcal: 2500, weightKg: 80, adherenceScore: 1 });
  const half = expectedRate({ targetKcal: 2000, maintenanceKcal: 2500, weightKg: 80, adherenceScore: 0.5 });
  assert.ok(Math.abs(half - full / 2) < 1e-9, 'a deficit kept half the time moves you half as fast');
});

/* ------------------------------------------------------------- checkpoints */

test('no weigh-ins means no checkpoints, not a crash', () => {
  assert.deepEqual(checkpoints({ checkIns: [], profile: { goals: {} }, meals: [] },
    { maintenanceKcal: 2500, today: TODAY }), []);
});

test('checkpoints are dated on the schedule and ordered', () => {
  const d = log({ days: 42, kcal: 2000, perDay: -0.5 / 7 });
  const marks = checkpoints(d, { maintenanceKcal: 2600, count: 4, today: TODAY });
  assert.equal(marks.length, 4);
  for (let i = 1; i < marks.length; i++) {
    assert.ok(marks[i].date > marks[i - 1].date, 'checkpoints must run forwards');
    assert.equal(
      Math.round((Date.parse(marks[i].date) - Date.parse(marks[i - 1].date)) / DAY), 14,
      'a fortnight apart, as configured');
  }
  assert.ok(marks[0].targetKg < d.checkIns[0].weightKg, 'a deficit should target a lower weight');
});

test('a checkpoint reads the nearest weigh-in and judges the right direction', () => {
  const d = log({ days: 42, kcal: 2000, perDay: -0.5 / 7 });
  const marks = checkpoints(d, { maintenanceKcal: 2600, count: 3, today: TODAY });
  const judged = marks.filter(m => m.actualKg != null);
  assert.ok(judged.length >= 2, 'past checkpoints with daily weigh-ins should all be judged');
  for (const m of judged) assert.ok(['on-track', 'ahead', 'behind'].includes(m.status));

  // On a cut, being lighter than the target is *ahead*, not behind.
  const fast = log({ days: 42, kcal: 2000, perDay: -1.2 / 7 });
  const fastMarks = checkpoints(fast, { maintenanceKcal: 2600, count: 3, today: TODAY });
  const first = fastMarks.find(m => m.actualKg != null);
  assert.ok(first.actualKg < first.targetKg);
  assert.equal(first.status, 'ahead', 'losing faster than planned on a cut is ahead');
});

test('a future checkpoint is pending and is the one flagged next', () => {
  const d = log({ days: 42, kcal: 2400, perDay: 0 });
  const marks = checkpoints(d, { maintenanceKcal: 2400, count: 6, today: TODAY });
  const next = nextCheckpoint(marks, TODAY);
  assert.ok(next, 'there should always be a checkpoint ahead');
  assert.ok(next.date > TODAY);
  assert.equal(next.status, 'pending');
  assert.equal(next.actualKg, null);
});

test('lastJudged picks the most recent checkpoint that had a reading', () => {
  const d = log({ days: 42, kcal: 2000, perDay: -0.5 / 7 });
  const marks = checkpoints(d, { maintenanceKcal: 2600, count: 6, today: TODAY });
  const last = lastJudged(marks);
  assert.ok(last);
  assert.notEqual(last.status, 'pending');
  const after = marks.slice(marks.indexOf(last) + 1);
  assert.ok(after.every(m => m.status === 'pending'), 'nothing judged should follow it');
});

/* ------------------------------------------------------------- adjustments */

test('an adjustment is bounded, rounded and only offered when it is needed', () => {
  assert.equal(suggestAdjustment(null, { targetKcal: 2500 }), null);
  assert.equal(suggestAdjustment({ status: 'pending' }, { targetKcal: 2500 }), null);
  assert.equal(suggestAdjustment({ status: 'on-track', deltaKg: 0.2 }, { targetKcal: 2500 }), null);

  const behind = suggestAdjustment({ status: 'behind', deltaKg: 1.5 }, { targetKcal: 2500, every: 14 });
  assert.ok(behind.delta < 0, 'being over the target weight should suggest eating less');
  assert.ok(Math.abs(behind.delta) <= 250, 'one checkpoint must not swing the plan wildly');
  // `% 10` on a negative multiple is -0, so compare the magnitude.
  assert.equal(Math.abs(behind.delta % 10), 0, 'suggestions are rounded to something a person can act on');

  const ahead = suggestAdjustment({ status: 'ahead', deltaKg: -2 }, { targetKcal: 2500, every: 14 });
  assert.ok(ahead.delta > 0);
  assert.ok(ahead.kcal >= 1200, 'a suggestion can never go below the safety floor');
});

test('a huge miss still cannot push the target below the floor', () => {
  const a = suggestAdjustment({ status: 'behind', deltaKg: 40 }, { targetKcal: 1250, every: 14 });
  assert.ok(a.kcal >= 1200);
});

/* ---------------------------------------------------- composition helpers */

test('body fat and lean mass are consistent inverses', () => {
  assert.ok(Math.abs(bodyFatFromLean(100, 80) - 20) < 1e-9);
  assert.ok(Math.abs(leanFromBodyFat(100, 20) - 80) < 1e-9);
  const lean = leanFromBodyFat(82.5, 17.4);
  assert.ok(Math.abs(bodyFatFromLean(82.5, lean) - 17.4) < 1e-9, 'the round trip should be lossless');
});

test('impossible body composition returns null rather than a nonsense number', () => {
  assert.equal(bodyFatFromLean(80, 90), null, 'lean mass cannot exceed bodyweight');
  assert.equal(bodyFatFromLean(0, 0), null);
  assert.equal(leanFromBodyFat(80, 0), null);
  assert.equal(leanFromBodyFat(80, 95), null, 'a 95% body fat reading is a typo, not a person');
});
