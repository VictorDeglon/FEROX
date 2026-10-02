/**
 * How much weight to put on the bar.
 *
 * Three questions, in order of how much we actually know:
 *
 *   1. You have never done this lift.  Estimate a 1RM from bodyweight, sex, age
 *      and stated experience, then **deliberately undershoot** it.
 *   2. You have done this lift.        Use what you actually lifted, and add to
 *      it when the last session says you earned it.
 *   3. You have done *this muscle*.    Carry what the log says about that muscle
 *      group across to lifts you have never tried.
 *
 * The undershoot in (1) is the important part and it is not timidity. A first
 * session that is 10 kg light costs thirty seconds to fix. A first session that
 * is 10 kg heavy costs a failed rep, a tweaked shoulder, or — most often — a
 * person who quietly decides this app is not for them. The asymmetry is the
 * whole argument, and every default here leans the same way: estimates are
 * conservative, rounding is downward, and progression is earned rather than
 * assumed.
 *
 * Everything is pure. It takes a profile and a data document and returns
 * numbers, so it is tested in node with no DOM.
 */
import { exerciseById } from './seed.js';
import { LEVELS } from './profile.js';

/**
 * One-rep max as a multiple of bodyweight, for an **intermediate male**,
 * expressed as what he would lift on a **barbell**.
 *
 * Priced in two factors rather than one number per exercise. A thousand-row
 * table would be a thousand chances to be inconsistent — and it could not be
 * written by hand anyway. A movement's price is:
 *
 *      class multiplier  x  gear factor
 *
 * The class says what the movement *is* (a horizontal press, a hinge, a
 * lateral raise). The gear factor says what you are holding: a dumbbell bench
 * press is the same movement at roughly a third of the barbell number **per
 * hand**, which is how people log it.
 *
 * The numbers sit around the middle of the published intermediate bands rather
 * than the top of them. They are a starting point for someone who has told us
 * nothing but their bodyweight, not a claim about anybody in particular.
 */
export const LOAD_CLASSES = {
  // pressing
  'press-h':  { mult: 1.00, region: 'upper' },   // bench press and its relatives
  'press-v':  { mult: 0.60, region: 'upper' },   // overhead press
  fly:        { mult: 0.29, region: 'upper' },
  'ext-arm':  { mult: 0.40, region: 'upper', gear: { dumbbell: 0.45 } },
  raise:      { mult: 0.28, region: 'upper' },   // lateral and front raises
  // pulling
  row:        { mult: 0.80, region: 'upper', gear: { dumbbell: 0.45 } },
  pulldown:   { mult: 0.85, region: 'upper' },
  shrug:      { mult: 1.00, region: 'upper', gear: { dumbbell: 0.55 } },
  rear:       { mult: 0.25, region: 'upper' },
  'curl-arm': { mult: 0.45, region: 'upper', gear: { dumbbell: 0.45 } },
  wrist:      { mult: 0.25, region: 'upper', gear: { dumbbell: 0.45 } },
  // hinge and squat
  deadlift:   { mult: 1.50, region: 'lower' },
  rdl:        { mult: 1.05, region: 'lower' },
  squat:      { mult: 1.25, region: 'lower' },
  legpress:   { mult: 2.20, region: 'lower' },   // the highest number in the gym
  thrust:     { mult: 1.40, region: 'lower', gear: { dumbbell: 0.45 } },
  lunge:      { mult: 0.50, region: 'lower', gear: { dumbbell: 0.35, kettlebell: 0.35 } },
  olympic:    { mult: 0.90, region: 'lower', gear: { dumbbell: 0.30, kettlebell: 0.35 } },
  sled:       { mult: 1.00, region: 'lower' },
  // leg isolation
  'curl-leg': { mult: 0.45, region: 'lower' },
  'ext-leg':  { mult: 0.55, region: 'lower' },
  calf:       { mult: 0.90, region: 'lower' },
  abduct:     { mult: 0.35, region: 'lower' },
  // trunk
  crunch:     { mult: 0.45, region: 'upper' },
  ext:        { mult: 0.40, region: 'lower' },   // back extension
};

/**
 * What the implement costs relative to a barbell doing the same job.
 *
 * `dumbbell` is per hand, because that is the number written on the dumbbell
 * and the number people type in. A machine reads slightly higher than a
 * barbell for the same effort — it stabilises the weight for you — and a cable
 * slightly lower, because part of the stack is fighting a pulley.
 */
export const GEAR_FACTOR = {
  barbell: 1, smith: 1.05, machine: 1.10, cable: 0.75,
  dumbbell: 0.36, kettlebell: 0.42, band: 0.28,
  bodyweight: 1, plyo: 1, cardio: 1, other: 1,
};

/**
 * A class may override the generic factor where it does not hold.
 *
 * One dumbbell figure cannot serve every movement: a dumbbell bench press is
 * about a third of the barbell total per hand, while a single-arm dumbbell row
 * is closer to a half. Without the override the model prescribed a one-kilo
 * lateral raise, which is not a conservative starting point — it is a wrong one.
 */
const gearFactorFor = (cls, gear) => cls.gear?.[gear] ?? GEAR_FACTOR[gear] ?? 1;

/** Smallest jump you can actually make, by implement, in kg. */
export const INCREMENT = {
  barbell: 2.5, smith: 2.5, machine: 2.5, cable: 2.5,
  dumbbell: 2, kettlebell: 4, band: 1, other: 2.5,
};

/**
 * Isolation work moves in smaller steps than a barbell squat ever will —
 * there is no 2.5 kg jump on a lateral raise that is not a 25% increase.
 */
const SMALL_STEP = new Set(['raise', 'rear', 'wrist', 'fly']);

export const incrementFor = ex => {
  const e = resolve(ex);
  if (!e?.loadClass) return 2.5;
  if (SMALL_STEP.has(e.loadClass)) return e.gear === 'dumbbell' ? 1 : 2.5;
  return INCREMENT[e.gear] ?? 2.5;
};

/** Accept either an exercise id or the exercise itself. */
const resolve = ex => (typeof ex === 'string' ? exerciseById(ex) : ex) ?? null;

/** The standard that prices a given exercise, or null if it takes no weight. */
export function standardFor(ex) {
  const e = resolve(ex);
  if (!e || e.unit !== 'kg' || !e.loadClass) return null;
  const cls = LOAD_CLASSES[e.loadClass];
  if (!cls) return null;
  return {
    mult: cls.mult * gearFactorFor(cls, e.gear),
    region: cls.region,
    gear: e.gear,
  };
}

/**
 * Experience, relative to "intermediate". These map onto `LEVELS` in
 * core/profile.js, which is also where the sets multiplier lives.
 */
export const LEVEL_STRENGTH = { 1: 0.55, 2: 0.75, 3: 1.00, 4: 1.25, 5: 1.50 };

/**
 * Female-to-male 1RM ratio at the same bodyweight. The gap is substantially
 * larger upper body than lower, so one global number would over-prescribe
 * pressing and under-prescribe squatting for half the people using this.
 */
export const SEX_RATIO = { upper: 0.62, lower: 0.75 };

/** Strength peaks in the twenties and gives ground slowly after. */
export function ageFactor(age) {
  if (!age || age <= 0) return 0.95;
  if (age < 16) return 0.72;
  if (age < 18) return 0.85;         // still growing; also the right way to be wrong
  if (age <= 30) return 1;
  if (age <= 40) return 0.97;
  if (age <= 50) return 0.92;
  if (age <= 60) return 0.85;
  return 0.75;
}

export function sexFactor(sex, region = 'upper') {
  if (sex === 'male') return 1;
  if (sex === 'female') return SEX_RATIO[region];
  return (1 + SEX_RATIO[region]) / 2;   // unstated: sit between the two
}

/**
 * Estimated one-rep max for someone who has never logged this lift.
 * @returns {number|null} kg, or null if the lift is not loaded with weight
 *          (bodyweight, timed and distance work all return null by design)
 */
export function predicted1RM(exId, profile) {
  const std = standardFor(exId);
  const bw = +profile?.weightKg;
  if (!std || !bw || bw <= 0) return null;

  const level = LEVEL_STRENGTH[profile.level] ?? 1;
  return bw * std.mult * level * sexFactor(profile.sex, std.region) * ageFactor(profile.age);
}

/* ------------------------------------------------------------ what you did */

/** Epley, the direction everyone knows it: a set of `reps` at `weight`. */
export const epley = (weight, reps) => weight * (1 + reps / 30);

/**
 * ...and backwards: the weight you could lift for `reps`.
 * This is the one that matters here — we know the max, we want the working set.
 */
export const weightForReps = (oneRM, reps) => oneRM / (1 + reps / 30);

/** Best estimated 1RM actually achieved on a lift, from the log. */
export function observed1RM(exId, sessions = []) {
  let best = 0, when = null;
  for (const s of sessions) {
    for (const e of s.entries ?? []) {
      if (e.ex !== exId) continue;
      for (const set of e.sets ?? []) {
        const reps = +set.reps || 0;
        const weight = +set.weight || 0;
        if (reps <= 0 || weight <= 0) continue;
        const score = epley(weight, reps);
        if (score > best) { best = score; when = s.date; }
      }
    }
  }
  return best ? { oneRM: best, date: when } : null;
}

/** The most recent session that contains this lift, newest first. */
export function lastPerformance(exId, sessions = []) {
  for (const s of sessions) {
    const entry = (s.entries ?? []).find(e => e.ex === exId);
    const sets = (entry?.sets ?? []).filter(x => (+x.reps || 0) > 0);
    if (sets.length) {
      return {
        date: s.date,
        sets,
        topWeight: Math.max(...sets.map(x => +x.weight || 0)),
        minReps: Math.min(...sets.map(x => +x.reps || 0)),
        totalReps: sets.reduce((t, x) => t + (+x.reps || 0), 0),
      };
    }
  }
  return null;
}

/* ------------------------------------------------------- the muscle trends */

/**
 * How each muscle group is doing against what we predicted for it.
 *
 * This is what lets a lift you have never done inherit what the log already
 * knows. If your back is pulling 20% above the estimate, the first time you are
 * handed a lat pulldown it should not open at the textbook number — the textbook
 * was wrong about you, and it was wrong in a direction the data has measured.
 *
 * @returns {{ [muscle:string]: { ratio, samples, best, label, confident } }}
 */
export function strengthProfile(data, profile = data?.profile) {
  const sessions = data?.sessions ?? [];
  const byMuscle = {};

  /*
   * Only the exercises this athlete has actually logged, not all thousand —
   * scanning the whole catalogue against every session was the difference
   * between a page that paints and one that stalls for a second.
   */
  const logged = new Set(sessions.flatMap(s => (s.entries ?? []).map(e => e.ex)));
  for (const exId of logged) {
    const ex = exerciseById(exId);
    if (!ex || !standardFor(ex)) continue;
    const seen = observed1RM(exId, sessions);
    const want = predicted1RM(exId, profile);
    if (!seen || !want) continue;

    (byMuscle[ex.muscle] ??= []).push({ exId, name: ex.name, ratio: seen.oneRM / want, oneRM: seen.oneRM });
  }

  const out = {};
  for (const [muscle, hits] of Object.entries(byMuscle)) {
    // Median, not mean: one lift logged with a typo'd weight should not drag a
    // whole muscle group's prescription with it.
    const sorted = [...hits].sort((a, b) => a.ratio - b.ratio);
    const mid = Math.floor(sorted.length / 2);
    const ratio = sorted.length % 2 ? sorted[mid].ratio : (sorted[mid - 1].ratio + sorted[mid].ratio) / 2;
    const best = [...hits].sort((a, b) => b.ratio - a.ratio)[0];

    out[muscle] = {
      ratio,
      samples: hits.length,
      best: best.name,
      // Two lifts is the point where a ratio stops being one lift's anecdote.
      confident: hits.length >= 2,
      label: describeRatio(ratio),
    };
  }
  return out;
}

export function describeRatio(ratio) {
  if (ratio >= 1.25) return 'Well ahead';
  if (ratio >= 1.08) return 'Ahead';
  if (ratio > 0.92) return 'On track';
  if (ratio > 0.78) return 'Behind';
  return 'Well behind';
}

/** Strongest and weakest groups, for the UI. Needs two groups to say anything. */
export function strengthRanking(profile) {
  const rows = Object.entries(profile)
    .map(([muscle, v]) => ({ muscle, ...v }))
    .sort((a, b) => b.ratio - a.ratio);
  return {
    rows,
    strongest: rows.length >= 2 ? rows[0] : null,
    weakest: rows.length >= 2 ? rows.at(-1) : null,
  };
}

/**
 * Extra sets for a muscle group that is behind, on the way to none for one that
 * is ahead.
 *
 * Note this runs the *opposite* way to the load adjustment, and deliberately:
 * a group that is ahead has earned heavier weight, and a group that is behind
 * needs more work rather than a heavier version of the work it is already
 * failing. Capped at one set either way — a plan that swings volume around on
 * a fortnight's evidence teaches nobody anything.
 */
export function setBias(muscle, profile) {
  const m = profile?.[muscle];
  if (!m?.confident) return 0;
  if (m.ratio < 0.85) return 1;
  if (m.ratio > 1.2) return -1;
  return 0;
}

/* -------------------------------------------------------------- the answer */

/** Round down to something you can actually load on the bar. */
export const roundLoad = (kg, step) => (kg > 0 ? Math.max(step, Math.floor(kg / step) * step) : 0);

/**
 * How far under the honest estimate we open.
 *
 * `fresh` is the case the whole module exists for: no history at all on this
 * lift, so the number is a guess about a stranger and opens 15% under. A lift
 * with real history opens 5% under its own best, which is not really an
 * undershoot so much as not programming a PR attempt as a working set.
 */
export const UNDERSHOOT = { fresh: 0.85, muscle: 0.88, known: 0.95 };

/** How far a muscle-group trend may move the estimate for an untried lift. */
export const CARRY_RANGE = [0.75, 1.35];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The weight to put on the bar for a prescribed set.
 *
 * @param {string} exId
 * @param {object} profile   the athlete
 * @param {object} data      the store document (for history)
 * @param {{reps:number, rir:number, intensity:number}} target
 * @returns {{kg, source, oneRM, confidence, note}|null}
 *          null for anything not loaded with weight — bodyweight, timed and
 *          distance work all prescribe reps and minutes, not kilos.
 */
export function suggestLoad(exId, profile, data, { reps = 8, rir = 2, intensity = 1 } = {}) {
  if (!standardFor(exId)) return null;

  const sessions = data?.sessions ?? [];
  const seen = observed1RM(exId, sessions);
  const want = predicted1RM(exId, profile);
  const step = incrementFor(exId);

  let oneRM, source, undershoot, note;

  if (seen) {
    oneRM = seen.oneRM;
    source = 'logged';
    undershoot = UNDERSHOOT.known;
    note = `From your best set on ${seen.date}.`;
  } else if (want) {
    // Nothing on this lift — but the muscle group may already have been
    // measured, in which case that is far better evidence than the textbook.
    const muscle = exerciseById(exId)?.muscle;
    const trend = strengthProfile(data, profile)[muscle];
    if (trend?.confident) {
      // Clamped, and hard. A deadlift double the estimate is real information
      // about your back; it is not permission to open a lift you have never
      // performed at double the textbook weight. The carry-over adjusts the
      // guess, it does not replace it.
      oneRM = want * clamp(trend.ratio, CARRY_RANGE[0], CARRY_RANGE[1]);
      source = 'muscle';
      undershoot = UNDERSHOOT.muscle;
      note = `Estimated, adjusted by how your ${muscle.toLowerCase()} work is going.`;
    } else {
      oneRM = want;
      source = 'estimate';
      undershoot = UNDERSHOOT.fresh;
      note = 'A conservative first guess. Add weight if it moves easily.';
    }
  } else {
    return null;
  }

  // The weight that leaves `rir` in the tank at `reps` is the weight you could
  // just about manage for `reps + rir`, so the reserve goes into the formula
  // rather than being applied as a fudge afterwards.
  const raw = weightForReps(oneRM, reps + rir) * undershoot * intensity;

  return {
    kg: roundLoad(raw, step),
    step,
    source,
    oneRM: Math.round(oneRM * 10) / 10,
    confidence: source === 'logged' ? 'good' : source === 'muscle' ? 'fair' : 'low',
    note,
  };
}

/**
 * Progressive overload, from what happened last time.
 *
 * Linear progression, because for everyone below "very advanced" it is still
 * the thing that works and the thing you can explain in one sentence: hit every
 * prescribed rep and the weight goes up next time.
 *
 * @returns {{kg, change, reason}} the load for the next session
 */
export function progressLoad(exId, data, { reps = 8, rir = 2, intensity = 1 } = {}, profile = data?.profile) {
  const base = suggestLoad(exId, profile, data, { reps, rir, intensity });
  if (!base) return null;

  const last = lastPerformance(exId, data?.sessions ?? []);
  if (!last || !last.topWeight) {
    return { ...base, change: 0, reason: base.note };
  }

  const step = base.step;
  // Lower-body barbell lifts add weight twice as fast; they have far more room.
  const std = standardFor(exId);
  const bigStep = std.region === 'lower' && std.gear === 'barbell' ? step * 2 : step;

  if (last.minReps >= reps) {
    return {
      ...base,
      kg: roundLoad(last.topWeight + bigStep, step),
      change: bigStep,
      reason: `You hit all ${reps} reps at ${last.topWeight} kg last time. Up it.`,
    };
  }
  if (last.minReps >= reps - 2) {
    return {
      ...base,
      kg: roundLoad(last.topWeight, step),
      change: 0,
      reason: `Close last time (${last.minReps}/${reps}). Same weight, finish the reps.`,
    };
  }
  return {
    ...base,
    kg: roundLoad(last.topWeight * 0.9, step),
    change: -roundLoad(last.topWeight * 0.1, step),
    reason: `Last time stalled at ${last.minReps} reps. Back off and build again.`,
  };
}

/** Is this exercise one we prescribe a weight for at all? */
export const isLoaded = exId => Boolean(standardFor(exId));
