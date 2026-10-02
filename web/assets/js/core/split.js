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
import { availableExercises, EXERCISES, EQUIP_RANK, byId, exerciseById } from './seed.js';
import { LEVELS } from './profile.js';
import { groupOf } from './anatomy.js';
import { progressLoad, isLoaded, setBias, strengthProfile } from './strength.js';

/**
 * Weekly templates. Each day names the muscle groups it covers and the
 * movement patterns to fill it with, in priority order.
 *
 * **A day's `focus` must name a group for every pattern it programmes.** The
 * picker prefers in-focus muscles, so an `h-push` slot on a day that forgot to
 * list Chest will happily be filled by a close-grip bench press — which is an
 * arm exercise, in focus, and leaves chest trained once that week. There is a
 * test for it; the 4-day Upper B day is where it bit.
 */
export const TEMPLATES = {
  2: {
    name: 'Full Body ×2', note: 'Two sessions, everything twice. The most efficient week there is.',
    // Both days press horizontally so chest is trained twice — with only two
    // sessions there is no room for a day that skips a major group.
    days: [
      { name: 'Full Body A', focus: ['Legs', 'Chest', 'Back', 'Shoulders', 'Core'], patterns: ['squat', 'h-push', 'h-pull', 'v-push', 'core'] },
      { name: 'Full Body B', focus: ['Legs', 'Chest', 'Back', 'Arms', 'Core'], patterns: ['hinge', 'h-push', 'v-pull', 'iso', 'core'] },
    ],
  },
  3: {
    name: 'Full Body ×3', note: 'Every muscle three times a week. Hard to beat at this frequency.',
    days: [
      { name: 'Full Body A', focus: ['Legs', 'Chest', 'Back', 'Core'], patterns: ['squat', 'h-push', 'h-pull', 'core'] },
      { name: 'Full Body B', focus: ['Legs', 'Shoulders', 'Back'], patterns: ['hinge', 'v-push', 'v-pull', 'iso'] },
      { name: 'Full Body C', focus: ['Legs', 'Chest', 'Back', 'Arms'], patterns: ['lunge', 'h-push', 'h-pull', 'iso'] },
    ],
  },
  4: {
    name: 'Upper / Lower ×2', note: 'Each half of the body twice a week, with room for accessories.',
    days: [
      { name: 'Upper A', focus: ['Chest', 'Back', 'Shoulders'], patterns: ['h-push', 'h-pull', 'v-push', 'iso'] },
      { name: 'Lower A', focus: ['Legs', 'Core'],               patterns: ['squat', 'hinge', 'iso', 'core'] },
      { name: 'Upper B', focus: ['Back', 'Shoulders', 'Chest', 'Arms'], patterns: ['v-pull', 'v-push', 'h-push', 'iso'] },
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
      { name: 'Conditioning', focus: ['Full body', 'Core'],    patterns: ['condition', 'sprint', 'core'] },
      { name: 'Push B', focus: ['Shoulders', 'Chest', 'Arms'], patterns: ['v-push', 'h-push', 'iso', 'iso'] },
      { name: 'Pull B', focus: ['Back', 'Arms'],               patterns: ['h-pull', 'v-pull', 'iso', 'iso'] },
      { name: 'Legs B', focus: ['Legs', 'Core'],               patterns: ['hinge', 'lunge', 'iso', 'core'] },
    ],
  },
};

export const templateFor = days => TEMPLATES[Math.min(7, Math.max(2, days))] ?? TEMPLATES[4];

/* --------------------------------------------------------- training modes */

/**
 * How a season actually trains.
 *
 * `repRange` and `restSec` already live on the season and say how *hard* each
 * set is. What was missing was how *many* — and those two move in opposite
 * directions. A set of three and a set of fifteen are not the same amount of
 * work, so a block built on triples needs five sets of them to accumulate
 * anything, while a block built on fifteens needs three or it becomes junk.
 *
 * That is the axis these modes exist to express, and it runs from one end to
 * the other:
 *
 *      strength    1–5 reps  ×  5 sets   heavy, long rests
 *      power       4–8 reps  ×  5 sets   fast, never grinding
 *      hypertrophy 6–12 reps ×  4 sets   the most total work of any mode
 *      balanced    6–10 reps ×  4 sets
 *      metabolic  10–15 reps ×  3 sets   light, short rests
 *      endurance   8–12 reps ×  3 sets   lifting holds; the running carries it
 *      quality    10–15 reps ×  3 sets   strict, unloaded, positions held
 *
 * `intensity` scales the prescribed weight on top of whatever the rep count
 * already implies — a metabolic block is not just higher reps, it is a
 * genuinely lighter bar.
 *
 * `prefer` names the exercises a mode reaches for first and `avoid` names the
 * movement patterns it will not programme, so a Greek Fire session reaches for
 * jumps and sprints where Iron Base reaches for a barbell.
 * `shape` transforms the week's template — see `applyMode`.
 */
export const MODES = {
  strength: {
    id: 'strength', label: 'Heavy, low rep',
    blurb: 'Few reps, many sets, long rests. The bar is the point.',
    setsMain: 5, setsAcc: 3, intensity: 1.0,
    prefer: ['back-barbell-squat', 'barbell-bench-press', 'barbell-deadlift',
      'standing-barbell-overhead-press', 'barbell-row', 'front-barbell-squat',
      'barbell-romanian-deadlift', 'pull-up', 'barbell-hip-thrust'],
    avoid: ['plyo', 'condition'],
    shape: 'compound',
  },
  power: {
    id: 'power', label: 'Fast and explosive',
    blurb: 'Moved fast, never ground out. Jumps and sprints alongside the lifting.',
    setsMain: 5, setsAcc: 3, intensity: 0.92,
    prefer: ['box-jump', 'broad-jump', 'depth-jump', 'medicine-ball-slam', 'clap-push-up',
      'sprint-intervals', 'hill-sprints', 'kettlebell-swing', 'front-barbell-squat',
      'power-clean', 'squat-jump', 'lateral-bound'],
    avoid: [],
    shape: 'explosive',
  },
  hypertrophy: {
    id: 'hypertrophy', label: 'Moderate rep, high volume',
    blurb: 'The most total work of any mode. Sets in the 6–12 range, and plenty of them.',
    setsMain: 4, setsAcc: 4, intensity: 0.95,
    // The barbell lifts belong in a mass block too — what makes it a mass block
    // is the extra accessory slot the `accessory` shape adds, not swapping the
    // bench press out for a dumbbell one.
    prefer: ['barbell-bench-press', 'back-barbell-squat', 'incline-dumbbell-bench-press',
      'cable-lat-pulldown', 'barbell-hip-thrust', 'lying-machine-leg-curl',
      'dumbbell-lateral-raise', 'barbell-curl', 'triceps-pushdown', 'cable-fly',
      'bent-over-dumbbell-rear-delt-fly', 'leg-press', 'machine-leg-extension'],
    avoid: ['sprint'],
    shape: 'accessory',
  },
  balanced: {
    id: 'balanced', label: 'Balanced',
    blurb: 'Compounds first, accessories after, conditioning kept ticking over.',
    setsMain: 4, setsAcc: 3, intensity: 0.95,
    prefer: [],
    avoid: [],
    shape: 'none',
  },
  metabolic: {
    id: 'metabolic', label: 'High rep, short rest',
    blurb: 'Lighter bar, higher reps, fewer sets and a conditioning finish. Built for a deficit.',
    setsMain: 3, setsAcc: 2, intensity: 0.85,
    prefer: ['kettlebell-swing', 'burpee', 'jump-rope', 'sled-push', 'goblet-dumbbell-squat',
      'walking-dumbbell-lunge', 'farmers-carry', 'battle-ropes', 'mountain-climber'],
    avoid: [],
    shape: 'conditioned',
  },
  endurance: {
    id: 'endurance', label: 'Aerobic-led',
    blurb: 'The running carries the block. Lifting drops to what holds what you have.',
    setsMain: 3, setsAcc: 2, intensity: 0.85,
    prefer: ['run', 'rowing-erg', 'cycling', 'jump-rope', 'easy-run', 'long-run', 'tempo-run'],
    avoid: ['plyo'],
    shape: 'aerobic',
  },
  quality: {
    id: 'quality', label: 'Light and strict',
    blurb: 'Low load, single-limb work, positions held until they stop being negotiable.',
    setsMain: 3, setsAcc: 2, intensity: 0.7,
    prefer: ['bulgarian-split-squat', 'walking-dumbbell-lunge', 'dead-bug', 'plank',
      'mobility-flow', 'hip-openers', 'cable-face-pull', 'dumbbell-row',
      'goblet-dumbbell-squat', 'bird-dog', 'cat-cow'],
    avoid: ['plyo', 'sprint'],
    shape: 'restorative',
  },
};

export const modeFor = season => MODES[season?.mode] ?? MODES.balanced;

/**
 * Reshape a week's template for the mode.
 *
 * The base templates already guarantee the thing that matters most — every
 * major group trained two to three times — so the modes *transform* them
 * rather than replacing them with twenty hand-written tables that would each
 * have to be checked against that rule separately.
 *
 * The one mode that deliberately breaks the frequency rule is `aerobic`, and it
 * breaks it on purpose: Tempo says in as many words that lifting drops to twice
 * a week to hold what you have while the running does the work.
 */
export function applyMode(template, mode) {
  const shape = mode?.shape ?? 'none';
  if (shape === 'none') return template;

  const days = template.days.map(d => ({ ...d, patterns: [...d.patterns] }));

  switch (shape) {
    case 'compound':
      // Fewer exercises, more sets on each. Drop trailing isolation work, never
      // below three movements — a strength day is four hard lifts, not eight.
      for (const d of days) {
        while (d.patterns.length > 3 && d.patterns.at(-1) === 'iso') d.patterns.pop();
      }
      break;

    case 'accessory':
      // One more isolation slot per day. This is where the extra volume goes.
      for (const d of days) d.patterns.push('iso');
      break;

    case 'explosive':
      // Jumps lead, while the nervous system is fresh. Lower-body days get them
      // first; upper-body days get a throw or a clap push-up after the pressing.
      for (const d of days) {
        if (d.focus.includes('Legs')) d.patterns.unshift('plyo');
        else d.patterns.splice(1, 0, 'plyo');
      }
      // Sprints close the last day. They are *appended*, not swapped in for a
      // lifting day — every template here is already the minimum arrangement
      // that trains each group twice, so converting a day to speed work would
      // buy the sprint by dropping a muscle group to once a week.
      days.at(-1).patterns.push('sprint');
      break;

    case 'conditioned':
      // Every lifting day finishes on conditioning — the calorie work in a cut
      // belongs after the weights, not instead of them.
      for (const d of days) d.patterns.push('condition');
      break;

    case 'aerobic': {
      // Two lifting days, everything else aerobic. Deliberately below the
      // 2-3x frequency rule the other modes hold to.
      const keep = days.slice(0, 2).map((d, i) => ({
        ...d,
        name: `Maintenance ${'AB'[i]}`,
        patterns: d.patterns.slice(0, 4),
      }));
      const runs = days.slice(2).map((d, i) => ({
        name: i === days.length - 3 ? 'Long run' : `Aerobic ${i + 1}`,
        focus: ['Full body'],
        patterns: i % 2 ? ['aerobic', 'condition', 'core'] : ['aerobic', 'core'],
      }));
      return { ...template, days: [...keep, ...runs] };
    }

    case 'restorative':
      // Single-limb and midline work in front of the barbell, mobility to close.
      for (const d of days) {
        d.patterns = d.patterns.filter(x => x !== 'plyo' && x !== 'sprint');
        if (!d.patterns.includes('core')) d.patterns.push('core');
        d.patterns.push('mobility');
      }
      break;
  }

  return { ...template, days };
}

/** The week's shape for a given athlete *and* season. */
export function templateForSeason(days, season) {
  return applyMode(templateFor(days), modeFor(season));
}

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

/**
 * Pick an exercise matching a pattern.
 *
 * Candidates are ranked, not filtered, so a preference that would empty the
 * pool simply loses to the next one down instead of leaving the slot blank.
 * In priority order:
 *
 *   1. a muscle group this day has not covered yet, taken in the order the
 *      template lists them. This is the rule that actually makes a template
 *      work: 'Full Body B' names Legs first and then reaches for a hinge, and
 *      a hinge can be a Romanian deadlift (legs) or a deadlift (back). Without
 *      this the day happily trains back twice and skips legs entirely.
 *   2. an exercise not already used in this session
 *   3. one this mode reaches for — a Greek Fire leg day opening on box jumps
 *      rather than a leg curl
 *   4. the best kit the athlete actually has. `availableExercises` returns
 *      everything at or *below* their tier, so without this a full-gym lifter
 *      was handed push-ups as their main chest movement about as often as a
 *      bench press.
 */
function pick(pool, pattern, used, focus, rand, mode, covered = new Set(), inSession = new Set()) {
  // Never the same movement twice in one session; everything else is a ranking.
  const candidates = pool.filter(e => e.pattern === pattern && !inSession.has(e.id));
  if (!candidates.length) return null;

  const idx = e => focus.indexOf(e.muscle);
  const rank = e => [
    // Whether the muscle is one of the day's, as a yes/no. Ranking by the
    // *position* in the focus list instead was too strong a preference: an
    // upper day listing Chest first would fill its overhead-press slot with a
    // dip and finish with no shoulder work at all.
    idx(e) === -1 ? 1 : 0,
    // Then spread across the day's groups rather than doubling up.
    covered.has(e.muscle) ? 1 : 0,
    // Only then does the order the template listed them in break the tie —
    // which is what makes 'Full Body B' reach for a Romanian deadlift when it
    // names Legs first, rather than a conventional deadlift.
    idx(e) === -1 ? focus.length : idx(e),
    used.has(e.id) ? 1 : 0,
    mode?.prefer?.includes(e.id) ? 0 : 1,
    -(EQUIP_RANK[e.equip] ?? 0),
  ];

  const scored = candidates.map(e => ({ e, key: rank(e) }));
  scored.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
    return 0;
  });

  // Everything tied at the top is equally correct; pick between them at random
  // so the plan still rotates week to week.
  const best = JSON.stringify(scored[0].key);
  const tied = scored.filter(x => JSON.stringify(x.key) === best);
  return tied[Math.floor(rand() * tied.length)].e;
}

/**
 * Narrow the pool to what the season actually wants.
 *
 * A mode's `avoid` list is a real filter — Iron Base should not hand you depth
 * jumps, and Reset should not hand you sprints. It is applied only when
 * something survives it, because a bodyweight-only athlete working around two
 * bad joints has little enough left to choose from already.
 */
function seasonPool(pool, mode) {
  if (!mode?.avoid?.length) return pool;
  const kept = pool.filter(e => !mode.avoid.includes(e.pattern));
  return kept.length >= 8 ? kept : pool;
}

/**
 * Build one session.
 * @param {object} day      a template day
 * @param {object} p        the athlete profile
 * @param {object} season   the season they are in (sets rep range and rest)
 * @param {number} readiness 1–10, today's self-report
 * @param {number} weekIndex weeks since the plan started
 * @param {object} [data]  the store document, for training history
 * @param {Set<string>} [used] exercises already programmed elsewhere this week.
 *        `buildWeek` passes one down so accessories rotate across the days
 *        instead of prescribing the same triceps pushdown four times.
 */
export function buildSession(day, p, season, readiness = 7, weekIndex = 0, data = null, used = new Set()) {
  const mode = modeFor(season);
  const pool = seasonPool(availableExercises(p), mode);
  const level = LEVELS.find(l => l.id === p.level) ?? LEVELS[2];
  const r = readinessFor(readiness);
  const deload = isDeloadWeek(weekIndex) ? DELOAD.sets : 1;

  // Everything the athlete has told us, and everything they have done, lands
  // on the session here. Experience and today's readiness were always in;
  // the block ramp and the deload came with the volume work; consistency and
  // the goal are the two that used to be collected and then ignored.
  const consistency = data ? consistencyBoost(trainingConsistency(data, p)) : 1;
  const goal = goalShift(p?.goal);

  const scale = level.sets * r.sets * weekIntensity(weekIndex) * deload
              * consistency * goal.sets;

  // A deload keeps the bar heavy on purpose — it is the volume that sheds
  // fatigue, and dropping the weight too makes the week useless as well as
  // easy. See DELOAD.
  const loadShift = goal.load * (isDeloadWeek(weekIndex) ? DELOAD.load : 1);
  const [lo, hi] = season?.repRange ?? [6, 10];

  // What the log says about each muscle group, so a group that is lagging can
  // be given more work and one that is ahead can be given more weight.
  const trends = data ? strengthProfile(data, p) : {};

  // Stable per athlete, per day, per week — so the session is the same each
  // time it is opened, but rotates as the weeks go by.
  const rand = seeded(`${p.level}:${p.daysPerWeek}:${p.equipment}:${(p.limits ?? []).join()}:${day.name}:${weekIndex}:${season?.id ?? ''}`);

  // Muscle groups this session has already reached, so the next slot can go
  // somewhere new rather than doubling up while a focus group goes untrained.
  const covered = new Set();
  // Exercises in *this* session. `used` is the week; this is the day, and the
  // difference matters: repeating a lift across the week is fine and repeating
  // it inside one session is not.
  const inSession = new Set();

  const entries = day.patterns.map((pattern, i) => {
    const ex = pick(pool, pattern, used, day.focus, rand, mode, covered, inSession);
    if (!ex) return null;
    used.add(ex.id);
    inSession.add(ex.id);
    covered.add(ex.muscle);

    const compound = i === 0 || ['squat', 'hinge', 'h-push', 'v-push', 'h-pull', 'v-pull'].includes(pattern);
    // The mode decides how many sets, which is the half of the prescription the
    // rep range on its own cannot express.
    const baseSets = compound ? mode.setsMain : mode.setsAcc;
    const sets = Math.max(2, Math.round(baseSets * scale) + setBias(ex.muscle, trends));
    const reps = ex.kind === 'time' ? Math.round(45 * r.load)
               : compound ? Math.round(lo + (hi - lo) * 0.3)
               : Math.round(lo + (hi - lo) * 0.85);

    const entry = { ex: ex.id, name: ex.name, muscle: ex.muscle, pattern: ex.pattern, sets, reps,
                    rest: compound ? (season?.restSec ?? 120) : 60, rir: level.rir };
    return withLoad(entry, p, data, mode, r, loadShift);
  }).filter(Boolean);

  // Heavy restrictions (bodyweight only, plus joints to work around) can leave
  // patterns with nothing to match, producing a two-exercise session. Backfill
  // from whatever is still usable rather than handing someone a thin day.
  //
  // Capped at the number of slots the day actually asked for: a Tempo aerobic
  // day is two movements *by design*, and padding it to four was quietly
  // turning a run into a chest session.
  const MIN = Math.min(4, day.patterns.length);
  if (entries.length < MIN) {
    // Four tiers, each a looser version of the last. The final one is allowed
    // to reuse something already programmed earlier in the week, because a
    // bodyweight-only athlete working around two joints can genuinely run out
    // of fresh options by Thursday — and a repeated movement beats a thin day.
    const usable = pool.filter(e => e.pattern !== 'mobility' && !inSession.has(e.id));
    const inFocus = e => day.focus.includes(e.muscle) || day.focus.includes('Full body');
    const tiers = [
      usable.filter(e => !used.has(e.id) && inFocus(e)),
      usable.filter(e => !used.has(e.id)),
      usable.filter(inFocus),
      usable,
    ];
    for (const ex of tiers.flat()) {
      if (entries.length >= MIN) break;
      if (inSession.has(ex.id)) continue;
      used.add(ex.id);
      inSession.add(ex.id);
      entries.push(withLoad({ ex: ex.id, name: ex.name, muscle: ex.muscle, pattern: ex.pattern,
        sets: Math.max(2, Math.round(mode.setsAcc * scale)),
        reps: ex.kind === 'time' ? Math.round(45 * r.load) : Math.round(lo + (hi - lo) * 0.85),
        rest: 60, rir: level.rir }, p, data, mode, r, loadShift));
    }
  }

  // Primed days earn a finisher; wrecked days do not get one.
  if (r.key === 'primed') {
    const fin = pool.find(e => e.pattern === 'condition' && !inSession.has(e.id));
    if (fin) entries.push({ ex: fin.id, name: fin.name, muscle: fin.muscle, pattern: fin.pattern,
      sets: 2, reps: 20, rest: 60, rir: 0, finisher: true });
  }

  return {
    name: day.name,
    focus: day.focus,
    readiness: r,
    weekIndex,
    mode,
    minutes: Math.round(entries.reduce((t, e) => t + e.sets * (e.rest + 45) / 60, 0)),
    entries,
  };
}

/**
 * Attach a prescribed weight to an entry, if it is the kind of exercise that
 * takes one. Bodyweight, timed and distance work get nothing rather than a
 * meaningless zero.
 *
 * Today's readiness scales the bar as well as the set count: a wrecked day at
 * full load is how people get hurt on the days they should have gone easy.
 */
function withLoad(entry, p, data, mode, r, shift = 1) {
  if (!isLoaded(entry.ex)) return entry;
  const load = progressLoad(entry.ex, data ?? { profile: p, sessions: [] }, {
    reps: entry.reps,
    rir: entry.rir,
    intensity: mode.intensity * r.load * shift,
  }, p);
  return load ? { ...entry, load } : entry;
}

/**
 * The whole week, for the plan preview.
 * @param {object} [data] the store document — supplies training history, which
 *        is what turns an estimated load into a progressed one
 */
export function buildWeek(p, season, readiness = 7, weekIndex = 0, data = null) {
  const mode = modeFor(season);
  const tpl = applyMode(templateFor(p.daysPerWeek), mode);
  // Shared across the week so the accessory slots rotate. Without it every day
  // reaches for the same first-ranked isolation movement and the week reads as
  // four copies of one session with the compounds swapped.
  const used = new Set();
  const week = {
    name: tpl.name,
    note: tpl.note,
    mode,
    deload: isDeloadWeek(weekIndex),
    days: tpl.days.map(d => buildSession(d, p, season, readiness, weekIndex, data, used)),
  };

  capVolume(week, season);
  week.volume = weeklyVolume(week);
  week.audit = auditVolume(week, season);
  return week;
}

/**
 * Trim a week back inside the recoverable range.
 *
 * `buildSession` cannot do this: it sees one day and the landmarks are weekly,
 * so a five-day mass block could hand out a perfectly reasonable session five
 * times and still total thirty-four sets of legs — which it did, before this
 * existed. That is not a hard week, it is a week nobody finishes.
 *
 * Sets come off accessories first and off the biggest offenders first, and
 * never below two, so what gets cut is the fourth set of leg extensions rather
 * than the squat that the session is actually built around. A compound is only
 * touched when trimming every accessory was not enough.
 *
 * It cannot always win, and that is correct rather than a bug worth fixing.
 * A mass block routinely leaves arms and shoulders a few sets over MRV because
 * most of that number is *secondary* credit from pressing and pulling — there
 * is barely any direct arm work left to cut, and cutting the bench press to
 * protect the triceps is the wrong trade by a wide margin. What survives the
 * cap is reported by `auditVolume` and shown to the athlete instead.
 */
function capVolume(week, season) {
  for (let pass = 0; pass < 2; pass++) {
    const over = auditVolume(week, season).filter(a => a.status === 'high');
    if (!over.length) return;

    for (const { group, target } of over) {
      // Accessories on the first pass, anything on the second.
      const COMPOUND = ['squat', 'hinge', 'h-push', 'v-push', 'h-pull', 'v-pull'];
      let excess = weeklyVolume(week)[group] - target;

      const entries = week.days
        .flatMap(d => d.entries)
        .filter(e => e.muscle === group && e.pattern !== 'mobility'
                  && (pass === 1 || !COMPOUND.includes(e.pattern)))
        .sort((a, b) => b.sets - a.sets);

      for (const e of entries) {
        if (excess <= 0) break;
        const cut = Math.min(e.sets - 2, Math.ceil(excess));
        if (cut <= 0) continue;
        e.sets -= cut;
        excess -= cut;
        e.trimmed = true;      // so the UI can say why, rather than just differ
      }
    }
  }
}

/**
 * How often each muscle group is actually trained — surfaced so the 2–3× rule
 * is visible rather than merely claimed.
 *
 * Mobility work is excluded. A hip opener is good for you and it is not a leg
 * session, and counting it as one would let a Reset block report a frequency
 * it has not earned.
 */
export function weeklyFrequency(week) {
  const tally = {};
  for (const day of week.days) {
    const worked = day.entries.filter(e => e.pattern !== 'mobility');
    for (const m of new Set(worked.map(e => e.muscle))) {
      tally[m] = (tally[m] ?? 0) + 1;
    }
  }
  return tally;
}

/* ------------------------------------------------------------- volume */

/**
 * Weekly hard-set landmarks per muscle group.
 *
 * This is the best-evidenced number in hypertrophy training and the one thing
 * the builder was not checking. The literature converges on a dose-response
 * curve in *hard sets per muscle per week*: below roughly 10 the stimulus is
 * maintenance at best, 10–20 is where almost all the growth happens, and past
 * the mid-20s the returns flatten while fatigue does not.
 *
 *   mev  minimum effective volume — below this a group is being maintained,
 *        not grown, which is a legitimate choice but should be a deliberate one
 *   mav  the middle of the productive range; what a normal week should hit
 *   mrv  maximum recoverable volume — past here is accumulating fatigue the
 *        following week has to pay for
 *
 * Smaller muscles sit higher because they recover faster and because much of
 * their volume arrives as secondary work. Legs and back sit lower per group
 * because a set of squats is far more systemically expensive than a set of
 * curls — the sets are not interchangeable and the landmarks should not
 * pretend they are.
 *
 * These are a *check*, not a prescription. `buildSession` still decides the
 * session; this says whether the week it produced lands in the right place.
 */
export const VOLUME = {
  Chest:     { mev: 10, mav: 16, mrv: 22 },
  Back:      { mev: 10, mav: 18, mrv: 25 },
  Shoulders: { mev:  8, mav: 16, mrv: 24 },
  Arms:      { mev:  8, mav: 14, mrv: 22 },
  Legs:      { mev: 10, mav: 16, mrv: 22 },
  Core:      { mev:  6, mav: 12, mrv: 20 },
};

/**
 * A set's worth of stimulus, split between the muscles that did the work.
 *
 * Counting a bench press as one set for chest and nothing for triceps
 * understates arm volume badly enough to matter — on a push/pull/legs split
 * the triceps can do most of their week's work inside pressing. Counting it
 * as a full set for both overstates it just as badly. Half credit for
 * secondary involvement is the convention, it is what the fractional-volume
 * literature uses, and it is close enough to be useful.
 */
const SECONDARY_CREDIT = 0.5;

/**
 * Hard sets per muscle group across a built week.
 *
 * Warm-ups are not in the plan at all, so every set counted here is a working
 * set. Mobility is excluded for the same reason it is excluded from
 * `weeklyFrequency`: a hip opener is good for you and it is not volume.
 */
export function weeklyVolume(week) {
  const tally = Object.fromEntries(Object.keys(VOLUME).map(g => [g, 0]));

  for (const day of week.days) {
    for (const e of day.entries) {
      if (e.pattern === 'mobility') continue;
      const ex = exerciseById(e.ex);

      // The group the exercise is filed under always gets full credit, so an
      // entry whose muscles are not in the catalogue still counts for
      // something rather than vanishing from the audit.
      if (tally[e.muscle] !== undefined) tally[e.muscle] += e.sets;

      for (const m of ex?.secondary ?? []) {
        const g = groupOf(m);
        if (g && g !== e.muscle && tally[g] !== undefined) {
          tally[g] += e.sets * SECONDARY_CREDIT;
        }
      }
    }
  }

  for (const g of Object.keys(tally)) tally[g] = Math.round(tally[g] * 10) / 10;
  return tally;
}

/**
 * Compare a week against the landmarks and say what is off.
 *
 * Deliberately returns findings rather than silently rebalancing the week.
 * The builder has to satisfy the split, the season, the athlete's kit and
 * their injuries at the same time, and a week that comes in two sets under
 * MEV on shoulders because they train twice a week in a bodyweight-only
 * Reset block is *correct*. Telling someone that is useful; quietly bolting
 * on two more sets of lateral raises to hit a number is not.
 *
 * @returns {{group:string, status:'low'|'high', sets:number, target:number}[]}
 */
export function auditVolume(week, season = null) {
  const tally = weeklyVolume(week);
  const mode = modeFor(season);
  const out = [];

  for (const [group, got] of Object.entries(tally)) {
    const l = VOLUME[group];
    if (!l) continue;

    // An aerobic block is not trying to hit MEV on chest and should not be
    // marked down for it — Tempo says in as many words that lifting drops to
    // holding what you have.
    const floor = mode.shape === 'aerobic' || mode.shape === 'restorative'
      ? Math.round(l.mev * 0.6) : l.mev;

    if (got < floor) out.push({ group, status: 'low', sets: got, target: floor });
    else if (got > l.mrv) out.push({ group, status: 'high', sets: got, target: l.mrv });
  }
  return out.sort((a, b) => Math.abs(b.sets - b.target) - Math.abs(a.sets - a.target));
}

/* ------------------------------------------------------------- deloads */

/** Weeks in a block before the deload. Four hard, one easy, repeat. */
export const MESOCYCLE = 5;

/** True on the last week of a block — the one that is meant to feel easy. */
export const isDeloadWeek = weekIndex => weekIndex > 0 && (weekIndex + 1) % MESOCYCLE === 0;

/**
 * How much of a normal week a deload is.
 *
 * Volume drops hard and intensity barely moves, which is the way round that
 * the evidence supports: keeping the bar heavy preserves the strength
 * adaptation while cutting the sets is what actually sheds the fatigue.
 * Halving the weight instead produces a week that is both useless and
 * demoralising.
 */
export const DELOAD = { sets: 0.5, load: 0.92 };

/* --------------------------------------------------- training consistency */

/**
 * How reliably the athlete has actually trained, 0–1, over recent weeks.
 *
 * `adherence()` in core/metabolism.js already measures whether someone eats
 * what they said they would, but it only ever fed the calorie checkpoints —
 * nothing about how consistently a person trains reached their training.
 * That is the wrong way round: eating is what you adjust *from* consistency,
 * and training is what consistency is *about*.
 *
 * Measured against their own stated `daysPerWeek`, not an absolute, so four
 * sessions a week is perfect for someone who promised four and short for
 * someone who promised six.
 */
export function trainingConsistency(data, profile = data?.profile, weeks = 4,
                                     today = new Date().toISOString().slice(0, 10)) {
  const want = Math.max(1, profile?.daysPerWeek ?? 4) * weeks;
  const from = new Date(Date.parse(today) - (weeks * 7 - 1) * 864e5).toISOString().slice(0, 10);
  const done = (data?.sessions ?? []).filter(s => s.date >= from && s.date <= today).length;
  return Math.min(1, done / want);
}

/**
 * Earn the right to train harder.
 *
 * `weekIntensity` ramps *down* — week one is deliberately the hardest, because
 * motivation is highest the day someone installs this. That is good for week
 * one and says nothing about week ten, and on its own it means a person who
 * has trained four times a week for two months is handed exactly the session
 * they were handed when they had never lifted anything.
 *
 * This is the other half: show up, and the work goes up. It is capped at
 * +12% because this multiplies a prescription that is *already* progressing
 * lift by lift through `progressLoad`, and two compounding sources of "more"
 * is how a plan runs away from the person following it.
 *
 * Below half consistency it drops *below* one, which is the part that matters
 * most. Someone returning after three missed weeks should not be handed the
 * volume they had built up to before they stopped; that is how a comeback
 * becomes another three weeks off.
 */
export function consistencyBoost(score) {
  if (!Number.isFinite(score)) return 1;
  if (score >= 0.5) return 1 + (score - 0.5) * 0.24;    // 1.00 -> 1.12
  return 0.8 + score * 0.4;                              // 0.80 -> 1.00
}

/**
 * What they are training *for*, applied to the training rather than only to
 * the food.
 *
 * `profile.goal` drove the calorie target and nothing else, which meant a
 * person cutting and a person bulking were handed identical sessions. In a
 * deficit recovery is genuinely impaired, so volume comes down while the
 * weight on the bar is held — that is the whole mechanism for keeping muscle
 * while losing fat, and dropping the load instead is the classic way to lose
 * both. In a surplus there is capacity for more work, so volume goes up.
 *
 * Strength does the opposite of hypertrophy on both axes: fewer, heavier.
 */
export const GOAL_SHIFT = {
  'fat-loss': { sets: 0.88, load: 1.00 },
  muscle:     { sets: 1.10, load: 1.00 },
  recomp:     { sets: 1.00, load: 1.00 },
  strength:   { sets: 0.92, load: 1.04 },
  athletic:   { sets: 0.95, load: 0.98 },
  health:     { sets: 0.92, load: 0.95 },
};
export const goalShift = goal => GOAL_SHIFT[goal] ?? { sets: 1, load: 1 };
