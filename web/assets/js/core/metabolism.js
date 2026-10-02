/**
 * Reading the plan back against what actually happened.
 *
 * `core/profile.js` predicts: Mifflin–St Jeor times an activity multiplier.
 * That prediction is a starting point and it is routinely wrong by 10–15% for
 * any individual — the equation was fitted to a population, not to you. Once
 * there are a few weeks of weigh-ins and a few weeks of food logging, the data
 * can answer the same question directly:
 *
 *   energy out = energy in − energy stored
 *
 * A kilogram of body mass change is taken as 7,700 kcal. That number is a
 * convention for fat, and early weight change is mostly water and glycogen, so
 * the estimate needs a long enough window to average that noise out. Every
 * function here refuses to guess from too little data and says so, because a
 * confidently wrong calorie target is worse than an honest "not yet".
 *
 * Everything is pure: it takes the store's data document and returns numbers.
 * That keeps it testable in node with no DOM and no localStorage.
 */

/** kcal per kg of body mass. The conventional figure for adipose tissue. */
export const KCAL_PER_KG = 7700;

/** Below this many days of overlap there is nothing worth estimating from. */
export const MIN_WINDOW_DAYS = 14;
/** ...and fewer food-logged days than this makes the intake figure a fiction. */
export const MIN_LOGGED_DAYS = 8;

const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* -------------------------------------------------------------- weight trend */

/**
 * Least-squares trend through a weight series, in kg per week.
 *
 * A regression rather than first-versus-last: bodyweight swings a kilo or two
 * on water alone, so two endpoints can show a gain across a fortnight of
 * genuine loss. The slope uses every point and is not at the mercy of which
 * day someone happened to step on the scale.
 */
export function weightTrend(series) {
  const pts = series.filter(p => Number.isFinite(p.value) && p.value > 0);
  if (pts.length < 2) return null;

  const t0 = Date.parse(pts[0].date);
  const xs = pts.map(p => (Date.parse(p.date) - t0) / 864e5);
  const ys = pts.map(p => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (den === 0) return null;                        // every reading on one day

  const perDay = num / den;
  return {
    perDay,
    perWeek: perDay * 7,
    spanDays: xs.at(-1),
    points: n,
    start: pts[0].value,
    latest: pts.at(-1).value,
    fitted: x => my + perDay * (x - mx),
  };
}

/* --------------------------------------------------------------- food intake */

/**
 * Mean calories per day across the window.
 *
 * Only days with something logged count toward the mean, but the ratio of
 * logged to elapsed days is returned alongside it — someone who logs three days
 * in fourteen has a believable average of those three days and an unusable
 * estimate of their fortnight.
 */
export function intakeOver(data, fromISO, toISO) {
  const totals = new Map();
  for (const m of data.meals) {
    if (m.date < fromISO || m.date > toISO) continue;
    totals.set(m.date, (totals.get(m.date) ?? 0) + (+m.kcal || 0));
  }
  const days = Math.max(1, daysBetween(fromISO, toISO) + 1);
  const logged = [...totals.values()];
  if (!logged.length) return { mean: 0, loggedDays: 0, days, coverage: 0 };
  return {
    mean: logged.reduce((a, b) => a + b, 0) / logged.length,
    loggedDays: logged.length,
    days,
    coverage: logged.length / days,
  };
}

/**
 * How closely the log tracks the calorie target, over the last `days`.
 *
 * Two separate numbers, because they fail differently. `logging` is how often
 * food was recorded at all; `onTarget` is how often a recorded day landed
 * within 10% of target. A plan is only as trustworthy as `logging`, and only
 * as effective as `onTarget`.
 */
export function adherence(data, days = 28, today = iso(new Date())) {
  const from = iso(new Date(Date.parse(today) - (days - 1) * 864e5));
  const target = data.profile?.goals?.kcal || 0;
  const totals = new Map();
  for (const m of data.meals) {
    if (m.date < from || m.date > today) continue;
    totals.set(m.date, (totals.get(m.date) ?? 0) + (+m.kcal || 0));
  }
  const values = [...totals.values()];
  const onTargetDays = target ? values.filter(v => Math.abs(v - target) <= target * 0.1).length : 0;
  const over = target ? values.filter(v => v > target * 1.1).length : 0;

  return {
    days,
    loggedDays: values.length,
    logging: values.length / days,
    onTargetDays,
    onTarget: values.length ? onTargetDays / values.length : 0,
    overDays: over,
    underDays: values.length - onTargetDays - over,
    meanKcal: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    /** A single 0–1 score: you have to log it *and* hit it. */
    score: values.length ? (values.length / days) * 0.4 + (onTargetDays / values.length) * 0.6 : 0,
  };
}

/* ----------------------------------------------------------- the estimate */

/**
 * Estimate real maintenance calories from the log.
 *
 * @param {object} data      the store document
 * @param {number} predicted Mifflin-based maintenance, the fallback
 * @param {number} window    how many days back to look
 * @returns {{kcal:number, predicted:number, factor:number, label:string,
 *            confidence:'none'|'low'|'fair'|'good', ...}}
 */
export function estimateMaintenance(data, predicted, { window = 42, today = iso(new Date()) } = {}) {
  const from = iso(new Date(Date.parse(today) - (window - 1) * 864e5));
  const series = (data.checkIns ?? [])
    .filter(c => c.date >= from && Number.isFinite(c.weightKg) && c.weightKg > 0)
    .map(c => ({ date: c.date, value: c.weightKg }));
  const trend = weightTrend(series);
  const intake = intakeOver(data, from, today);

  const bare = {
    kcal: Math.round(predicted),
    predicted: Math.round(predicted),
    factor: 1,
    label: 'Not enough data yet',
    confidence: 'none',
    trendPerWeek: trend?.perWeek ?? 0,
    meanKcal: Math.round(intake.mean),
    loggedDays: intake.loggedDays,
    spanDays: trend?.spanDays ?? 0,
  };

  if (!trend || trend.spanDays < MIN_WINDOW_DAYS) return bare;
  if (intake.loggedDays < MIN_LOGGED_DAYS) return bare;

  //     out = in − stored.  A kilo lost per week is 1,100 kcal a day of deficit.
  const storedPerDay = trend.perDay * KCAL_PER_KG;
  const estimated = intake.mean - storedPerDay;

  // Anything outside ±30% of the prediction is far likelier to be a logging
  // artefact — a fortnight of untracked weekends, a scale in pounds — than a
  // real metabolism. Blend toward the prediction rather than trusting it.
  const raw = estimated / predicted;
  const factor = clamp(raw, 0.7, 1.3);

  const confidence =
    intake.coverage >= 0.8 && trend.spanDays >= 28 && trend.points >= 8 ? 'good'
    : intake.coverage >= 0.55 && trend.spanDays >= 21 ? 'fair'
    : 'low';

  // A low-confidence estimate is pulled most of the way back to the equation.
  const weight = { low: 0.35, fair: 0.7, good: 1 }[confidence];
  const blended = predicted * (1 + (factor - 1) * weight);

  return {
    ...bare,
    kcal: Math.round(blended),
    factor: blended / predicted,
    label: describeFactor(blended / predicted),
    confidence,
    coverage: intake.coverage,
    rawEstimate: Math.round(estimated),
    clamped: raw !== factor,
    trendPerWeek: trend.perWeek,
    spanDays: trend.spanDays,
  };
}

/** Plain English for how the measured number compares to the predicted one. */
export function describeFactor(factor) {
  if (factor >= 1.08) return 'Faster than the equation predicts';
  if (factor >= 1.03) return 'A little faster than predicted';
  if (factor > 0.97) return 'Close to the equation';
  if (factor > 0.92) return 'A little slower than predicted';
  return 'Slower than the equation predicts';
}

/* --------------------------------------------------------------- checkpoints */

/**
 * The weight change a plan should produce, in kg per week.
 *
 * Built from the gap between the calorie target and measured maintenance, then
 * scaled by how consistently the target is actually hit — a 500 kcal deficit
 * followed half the time is a 250 kcal deficit. Capped at 1% of bodyweight a
 * week in either direction, which is the rate above which a cut starts costing
 * muscle and a bulk starts being mostly fat.
 */
export function expectedRate({ targetKcal, maintenanceKcal, weightKg, adherenceScore = 1 }) {
  const gap = (targetKcal - maintenanceKcal) * clamp(adherenceScore, 0, 1);
  const raw = (gap * 7) / KCAL_PER_KG;
  const cap = weightKg * 0.01;
  return clamp(raw, -cap, cap);
}

/**
 * The checkpoint schedule: a sequence of dated weight goals from `planStart`.
 *
 * Each one is the weight the current plan implies by that date, given what the
 * data now says about maintenance and adherence. They are recomputed on every
 * read rather than frozen — the whole point is that a goal set six weeks ago
 * from a wrong metabolism estimate should not still be the goal today.
 *
 * @returns {{index, date, targetKg, actualKg, deltaKg, status, past}[]}
 */
export function checkpoints(data, { maintenanceKcal, count = 6, today = iso(new Date()) } = {}) {
  const every = data.settings?.checkpointEvery || 14;
  const start = data.planStart ?? today;
  const weights = (data.checkIns ?? [])
    .filter(c => Number.isFinite(c.weightKg) && c.weightKg > 0)
    .map(c => ({ date: c.date, value: c.weightKg }));
  if (!weights.length) return [];

  // Anchor on the first weigh-in at or after the plan started; failing that,
  // the last one before it. Someone who restarts their plan should be measured
  // from the weight they restarted at.
  const anchor = weights.find(w => w.date >= start) ?? weights.at(-1);
  const rate = expectedRate({
    targetKcal: data.profile?.goals?.kcal ?? maintenanceKcal,
    maintenanceKcal,
    weightKg: anchor.value,
    adherenceScore: adherence(data, 28, today).score || 0.6,
  });

  const out = [];
  for (let i = 1; i <= count; i++) {
    const date = iso(new Date(Date.parse(anchor.date) + i * every * 864e5));
    const weeks = (i * every) / 7;
    const targetKg = +(anchor.value + rate * weeks).toFixed(1);
    const past = date <= today;

    // The reading that actually counts is the one nearest the checkpoint date,
    // within half a period — a scale reading three days late still answers it.
    const near = past
      ? weights.reduce((best, w) => {
        const d = Math.abs(daysBetween(date, w.date));
        return d <= every / 2 && (!best || d < Math.abs(daysBetween(date, best.date))) ? w : best;
      }, null)
      : null;

    const actualKg = near?.value ?? null;
    const deltaKg = actualKg == null ? null : +(actualKg - targetKg).toFixed(1);
    out.push({
      index: i, date, targetKg, actualKg, deltaKg, past,
      status: statusFor(deltaKg, rate),
      rate,
    });
  }
  return out;
}

/**
 * Did a checkpoint land? "Ahead" always means *further in the intended
 * direction*, so a bulk that gained more than planned and a cut that lost more
 * than planned both read as ahead. Half a kilo is the tolerance — below that
 * it is a different scale, a different time of day, or lunch.
 */
function statusFor(deltaKg, rate) {
  if (deltaKg == null) return 'pending';
  if (Math.abs(deltaKg) <= 0.5) return 'on-track';
  const direction = rate >= 0 ? 1 : -1;
  return deltaKg * direction > 0 ? 'ahead' : 'behind';
}

/** The next checkpoint that has not happened yet. */
export const nextCheckpoint = (list, today = iso(new Date())) =>
  list.find(c => c.date > today) ?? null;

/** The most recent checkpoint with a reading against it. */
export const lastJudged = list => [...list].reverse().find(c => c.status !== 'pending') ?? null;

/**
 * What to do about a checkpoint that missed, as a calorie adjustment.
 *
 * Deliberately small and deliberately bounded: one checkpoint's miss is weak
 * evidence, and a plan that swings 600 kcal every fortnight teaches nothing.
 * 10% of the gap needed to close the error over the next period, capped at 250.
 */
export function suggestAdjustment(checkpoint, { targetKcal, every = 14 }) {
  if (!checkpoint || checkpoint.status === 'pending' || checkpoint.status === 'on-track') return null;
  const kcalOff = (checkpoint.deltaKg * KCAL_PER_KG) / every;   // per day, signed
  const delta = clamp(Math.round(-kcalOff * 0.5 / 10) * 10, -250, 250);
  if (!delta) return null;
  return {
    delta,
    kcal: Math.max(1200, targetKcal + delta),
    reason: checkpoint.status === 'behind'
      ? `You are ${Math.abs(checkpoint.deltaKg).toFixed(1)} kg off that checkpoint.`
      : `You are ${Math.abs(checkpoint.deltaKg).toFixed(1)} kg past that checkpoint.`,
  };
}

/** Body fat percentage from weight and lean mass, when both were recorded. */
export const bodyFatFromLean = (weightKg, leanKg) =>
  weightKg > 0 && leanKg > 0 && leanKg < weightKg
    ? ((weightKg - leanKg) / weightKg) * 100
    : null;

/** Lean mass implied by a weight and a body-fat percentage. */
export const leanFromBodyFat = (weightKg, bodyFat) =>
  weightKg > 0 && bodyFat > 0 && bodyFat < 70 ? weightKg * (1 - bodyFat / 100) : null;
