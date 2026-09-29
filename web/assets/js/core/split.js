/**
 * Building someone a week of training.
 *
 * Two rules drive everything here:
 *   1. Every muscle group gets hit 2–3 times a week. Once a week is the single
 *      most common reason people stall, and the research on frequency is about
 *      as settled as this field gets.
 *   2. The first block is deliberately harder than the steady state. People
 *      install a training app while they are motivated; week one should meet
 *      that, then settle into something survivable by week four.
 */
import { availableExercises, EXERCISES } from './seed.js';
import { LEVELS } from './profile.js';

/**
 * Weekly templates. Each day names the muscle groups it covers and the
 * movement patterns to fill it with, in priority order.
 */
export const TEMPLATES = {
  2: {
    name: 'Full Body ×2', note: 'Two sessions, everything twice. The most efficient week there is.',
    // Both days press horizontally so chest is trained twice — with only two
    // sessions there is no room for a day that skips a major group.
    days: [
      { name: 'Full Body A', focus: ['Legs', 'Chest', 'Back', 'Shoulders'], patterns: ['squat', 'h-push', 'h-pull', 'v-push', 'core'] },
      { name: 'Full Body B', focus: ['Legs', 'Chest', 'Back', 'Arms'],      patterns: ['hinge', 'h-push', 'v-pull', 'iso', 'core'] },
    ],
  },
  3: {
    name: 'Full Body ×3', note: 'Every muscle three times a week. Hard to beat at this frequency.',
    days: [
      { name: 'Full Body A', focus: ['Legs', 'Chest', 'Back'],     patterns: ['squat', 'h-push', 'h-pull', 'core'] },
      { name: 'Full Body B', focus: ['Legs', 'Shoulders', 'Back'], patterns: ['hinge', 'v-push', 'v-pull', 'iso'] },
      { name: 'Full Body C', focus: ['Legs', 'Chest', 'Arms'],     patterns: ['lunge', 'h-push', 'h-pull', 'iso'] },
    ],
  },
  4: {
    name: 'Upper / Lower ×2', note: 'Each half of the body twice a week, with room for accessories.',
    days: [
      { name: 'Upper A', focus: ['Chest', 'Back', 'Shoulders'], patterns: ['h-push', 'h-pull', 'v-push', 'iso'] },
      { name: 'Lower A', focus: ['Legs', 'Core'],               patterns: ['squat', 'hinge', 'iso', 'core'] },
      { name: 'Upper B', focus: ['Back', 'Shoulders', 'Arms'],  patterns: ['v-pull', 'v-push', 'h-push', 'iso'] },
      { name: 'Lower B', focus: ['Legs', 'Core'],               patterns: ['hinge', 'lunge', 'iso', 'core'] },
    ],
  },
  5: {
    name: 'Upper / Lower / Push / Pull / Legs', note: 'Five days, everything twice, one day for whatever is lagging.',
    days: [
      { name: 'Upper',  focus: ['Chest', 'Back', 'Shoulders'], patterns: ['h-push', 'h-pull', 'v-push', 'iso'] },
      { name: 'Lower',  focus: ['Legs', 'Core'],               patterns: ['squat', 'hinge', 'iso', 'core'] },
      { name: 'Push',   focus: ['Chest', 'Shoulders', 'Arms'], patterns: ['h-push', 'v-push', 'iso', 'iso'] },
      { name: 'Pull',   focus: ['Back', 'Arms'],               patterns: ['v-pull', 'h-pull', 'iso', 'iso'] },
      { name: 'Legs',   focus: ['Legs', 'Core'],               patterns: ['hinge', 'lunge', 'iso', 'core'] },
    ],
  },
  6: {
    name: 'Push / Pull / Legs ×2', note: 'The classic. Six days, each muscle group twice, high total volume.',
    days: [
      { name: 'Push A', focus: ['Chest', 'Shoulders', 'Arms'], patterns: ['h-push', 'v-push', 'iso', 'iso'] },
      { name: 'Pull A', focus: ['Back', 'Arms'],               patterns: ['v-pull', 'h-pull', 'iso', 'iso'] },
      { name: 'Legs A', focus: ['Legs', 'Core'],               patterns: ['squat', 'hinge', 'iso', 'core'] },
      { name: 'Push B', focus: ['Shoulders', 'Chest', 'Arms'], patterns: ['v-push', 'h-push', 'iso', 'iso'] },
      { name: 'Pull B', focus: ['Back', 'Arms'],               patterns: ['h-pull', 'v-pull', 'iso', 'iso'] },
      { name: 'Legs B', focus: ['Legs', 'Core'],               patterns: ['hinge', 'lunge', 'iso', 'core'] },
    ],
  },
  7: {
    name: 'Push / Pull / Legs ×2 + Conditioning', note: 'Six lifting days plus one that is purely conditioning.',
    days: [
      { name: 'Push A', focus: ['Chest', 'Shoulders', 'Arms'], patterns: ['h-push', 'v-push', 'iso', 'iso'] },
      { name: 'Pull A', focus: ['Back', 'Arms'],               patterns: ['v-pull', 'h-pull', 'iso', 'iso'] },
      { name: 'Legs A', focus: ['Legs', 'Core'],               patterns: ['squat', 'hinge', 'iso', 'core'] },
      { name: 'Conditioning', focus: ['Full body'],            patterns: ['condition', 'sprint', 'core'] },
      { name: 'Push B', focus: ['Shoulders', 'Chest', 'Arms'], patterns: ['v-push', 'h-push', 'iso', 'iso'] },
      { name: 'Pull B', focus: ['Back', 'Arms'],               patterns: ['h-pull', 'v-pull', 'iso', 'iso'] },
      { name: 'Legs B', focus: ['Legs', 'Core'],               patterns: ['hinge', 'lunge', 'iso', 'core'] },
    ],
  },
};

export const templateFor = days => TEMPLATES[Math.min(7, Math.max(2, days))] ?? TEMPLATES[4];

/* --------------------------------------------------------------- readiness */

/**
 * How today feels, 1–10, and what we do about it. Scaling the session beats
 * skipping it — a short honest session keeps the streak and the habit.
 */
export const READINESS = [
  { max: 2,  key: 'wrecked', label: 'Wrecked',   sets: 0.5, load: 0.7, note: 'Cut to half volume and keep it light. Showing up is the win today.' },
  { max: 4,  key: 'rough',   label: 'Rough',     sets: 0.7, load: 0.85, note: 'Trimmed a set from everything and pulled the loads back.' },
  { max: 6,  key: 'okay',    label: 'Okay',      sets: 0.9, load: 0.95, note: 'Slightly lighter than normal. Stop a rep or two short.' },
  { max: 8,  key: 'good',    label: 'Good',      sets: 1.0, load: 1.0,  note: 'Your normal session. Push the top sets.' },
  { max: 10, key: 'primed',  label: 'Primed',    sets: 1.1, load: 1.05, note: 'Extra set on the main lift and a finisher. Use it.' },
];

export const readinessFor = score => READINESS.find(r => score <= r.max) ?? READINESS[3];

/**
 * Week one is harder on purpose; by week four it settles. Motivation is highest
 * the day someone installs this, and a first session that feels easy wastes it.
 */
export function weekIntensity(weekIndex = 0) {
  const ramp = [1.15, 1.08, 1.03, 1.0];
  return ramp[Math.min(weekIndex, ramp.length - 1)];
}

/* ----------------------------------------------------------------- builder */

/**
 * A small deterministic PRNG, seeded from a string.
 *
 * Selection must not use Math.random(): a plan that reshuffles itself on every
 * page load is not a plan, and you cannot progress a lift you might not see
 * tomorrow. Seeding from the athlete, the day and the week index instead gives
 * the same session every time you open it, while still varying between days and
 * rotating exercises week to week.
 */
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Pick an exercise matching a pattern, preferring ones not already used. */
function pick(pool, pattern, used, focus, rand) {
  const byPattern = pool.filter(e => e.pattern === pattern);
  const inFocus = byPattern.filter(e => focus.includes(e.muscle));
  const candidates = (inFocus.length ? inFocus : byPattern).filter(e => !used.has(e.id));
  const fallback = (inFocus.length ? inFocus : byPattern);
  const from = candidates.length ? candidates : fallback;
  return from.length ? from[Math.floor(rand() * from.length)] : null;
}

/**
 * Build one session.
 * @param {object} day      a template day
 * @param {object} p        the athlete profile
 * @param {object} season   the season they are in (sets rep range and rest)
 * @param {number} readiness 1–10, today's self-report
 * @param {number} weekIndex weeks since the plan started
 */
export function buildSession(day, p, season, readiness = 7, weekIndex = 0) {
  const pool = availableExercises(p);
  const level = LEVELS.find(l => l.id === p.level) ?? LEVELS[2];
  const r = readinessFor(readiness);
  const scale = level.sets * r.sets * weekIntensity(weekIndex);
  const [lo, hi] = season?.repRange ?? [6, 10];
  const used = new Set();

  // Stable per athlete, per day, per week — so the session is the same each
  // time it is opened, but rotates as the weeks go by.
  const rand = seeded(`${p.level}:${p.daysPerWeek}:${p.equipment}:${(p.limits ?? []).join()}:${day.name}:${weekIndex}:${season?.id ?? ''}`);

  const entries = day.patterns.map((pattern, i) => {
    const ex = pick(pool, pattern, used, day.focus, rand);
    if (!ex) return null;
    used.add(ex.id);

    const compound = i === 0 || ['squat', 'hinge', 'h-push', 'v-push', 'h-pull', 'v-pull'].includes(pattern);
    const baseSets = compound ? 4 : 3;
    const sets = Math.max(2, Math.round(baseSets * scale));
    const reps = ex.kind === 'time' ? Math.round(45 * r.load)
               : compound ? Math.round(lo + (hi - lo) * 0.3)
               : Math.round(lo + (hi - lo) * 0.85);

    return { ex: ex.id, name: ex.name, muscle: ex.muscle, sets, reps,
             rest: compound ? (season?.restSec ?? 120) : 60, rir: level.rir };
  }).filter(Boolean);

  // Heavy restrictions (bodyweight only, plus joints to work around) can leave
  // patterns with nothing to match, producing a two-exercise session. Backfill
  // from whatever is still usable rather than handing someone a thin day.
  const MIN = 4;
  if (entries.length < MIN) {
    const extra = pool.filter(e => !used.has(e.id) && e.pattern !== 'mobility'
      && (day.focus.includes(e.muscle) || day.focus.includes('Full body')));
    const rest = pool.filter(e => !used.has(e.id) && e.pattern !== 'mobility');
    for (const ex of [...extra, ...rest]) {
      if (entries.length >= MIN) break;
      if (used.has(ex.id)) continue;
      used.add(ex.id);
      entries.push({ ex: ex.id, name: ex.name, muscle: ex.muscle,
        sets: Math.max(2, Math.round(3 * scale)),
        reps: ex.kind === 'time' ? Math.round(45 * r.load) : Math.round(lo + (hi - lo) * 0.85),
        rest: 60, rir: level.rir });
    }
  }

  // Primed days earn a finisher; wrecked days do not get one.
  if (r.key === 'primed') {
    const fin = pool.find(e => e.pattern === 'condition' && !used.has(e.id));
    if (fin) entries.push({ ex: fin.id, name: fin.name, muscle: fin.muscle, sets: 2, reps: 20, rest: 60, rir: 0, finisher: true });
  }

  return {
    name: day.name,
    focus: day.focus,
    readiness: r,
    weekIndex,
    minutes: Math.round(entries.reduce((t, e) => t + e.sets * (e.rest + 45) / 60, 0)),
    entries,
  };
}

/** The whole week, for the plan preview. */
export function buildWeek(p, season, readiness = 7, weekIndex = 0) {
  const tpl = templateFor(p.daysPerWeek);
  return {
    name: tpl.name,
    note: tpl.note,
    days: tpl.days.map(d => buildSession(d, p, season, readiness, weekIndex)),
  };
}

/** How often each muscle group appears — surfaced so the 2–3× rule is visible. */
export function weeklyFrequency(week) {
  const tally = {};
  for (const day of week.days) {
    for (const m of new Set(day.entries.map(e => e.muscle))) {
      tally[m] = (tally[m] ?? 0) + 1;
    }
  }
  return tally;
}
