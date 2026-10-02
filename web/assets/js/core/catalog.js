/**
 * Searching a thousand exercises.
 *
 * The old picker was a `<select>` of every exercise, which is fine at fifty and
 * unusable at a thousand. What replaces it has to answer the way people
 * actually look for a movement — by name, by the muscle they want to hit, by
 * what kit is in front of them — and it has to do it on every keystroke without
 * the phone stuttering.
 *
 * So: one index built once, a scored match rather than a filter, and no regular
 * expressions in the hot path.
 */
import { EXERCISES } from './seed.js';
import { ANATOMY, GROUPS } from './anatomy.js';

/** The facets the UI filters by, in the order it shows them. */
export const GEAR_FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'dumbbell',   label: 'Dumbbells' },
  { id: 'barbell',    label: 'Barbell' },
  { id: 'machine',    label: 'Machine' },
  { id: 'cable',      label: 'Cable' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'band',       label: 'Bands' },
  { id: 'plyo',       label: 'Plyometric' },
  { id: 'cardio',     label: 'Cardio' },
  { id: 'other',      label: 'Other' },
];

export const MECHANIC_FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'compound',   label: 'Compound' },
  { id: 'isolation',  label: 'Isolation' },
];

/**
 * A searchable blob per exercise: its name, its group, its muscles, its gear.
 * Built once at module load — 1,000 lowercase strings is nothing, and doing it
 * per keystroke is the difference between instant and laggy.
 */
const HAYSTACK = new Map(EXERCISES.map(e => {
  const muscleNames = [...e.primary, ...e.secondary]
    .map(id => ANATOMY.find(m => m.id === id)?.name ?? '')
    .join(' ');
  return [e.id, `${e.name} ${e.muscle} ${e.gear} ${e.mechanic} ${muscleNames}`.toLowerCase()];
}));

/** Split a query into the words that all have to match. */
const terms = q => q.toLowerCase().split(/\s+/).filter(Boolean);

/**
 * How common an implement is, so a search lands on the movement people mean.
 *
 * This is the part that made the difference. Ranking purely on where the word
 * appeared in the name put "Bench Dip" above "Barbell Bench Press" and "Squat
 * Jump" above "Back Barbell Squat" — because the canonical movement in this
 * catalogue almost always carries a qualifier in front of it, so it never
 * starts with the word you typed.
 */
const GEAR_WEIGHT = {
  barbell: 6, dumbbell: 5, bodyweight: 4, machine: 3, cable: 3,
  kettlebell: 2, band: 1, plyo: 1, cardio: 1, other: 0,
};

/** Whole-word match, without building a RegExp on every keystroke. */
function hasWord(haystack, word) {
  let i = haystack.indexOf(word);
  while (i !== -1) {
    const before = i === 0 ? ' ' : haystack[i - 1];
    const after = haystack[i + word.length] ?? ' ';
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    i = haystack.indexOf(word, i + 1);
  }
  return false;
}

/**
 * How well an exercise matches, or -1 for no match.
 *
 * Every word has to appear somewhere. Beyond that the score prefers a whole
 * word in the *name* over a fragment, a name over a muscle or a piece of kit,
 * and — decisively — the ordinary version of a movement over an exotic one.
 */
function score(ex, words) {
  const hay = HAYSTACK.get(ex.id);
  const name = ex.name.toLowerCase();
  let total = 0;

  for (const w of words) {
    if (!hay.includes(w)) return -1;
    if (hasWord(name, w)) total += 80;
    else if (name.includes(w)) total += 40;
    else total += 10;                        // matched a muscle or the gear
  }

  // The plain version of a movement beats a modified one, decisively. This is
  // the difference between searching "bench" and getting the bench press, and
  // searching "bench" and getting a dead bench press with chains on it.
  total += Math.max(0, 3 - ex.variant) * 14;
  total += (GEAR_WEIGHT[ex.gear] ?? 0) * 2;
  if (ex.mechanic === 'compound') total += 6;
  return total - name.length / 50;
}

/**
 * Search and filter the catalogue.
 *
 * @param {{q?:string, group?:string, gear?:string, mechanic?:string,
 *          equipment?:string, limits?:string[], limit?:number}} opts
 * @returns {{rows:object[], total:number}}
 */
export function searchExercises({
  q = '', group = 'All', gear = 'all', mechanic = 'all',
  equipment = null, limits = null, limit = 60,
} = {}) {
  const words = terms(q);
  const avoid = limits?.length ? new Set(limits.filter(l => l !== 'none')) : null;
  const rank = { bodyweight: 0, minimal: 1, home: 2, gym: 3 };
  const have = equipment ? rank[equipment] ?? 3 : null;

  const hits = [];
  for (const e of EXERCISES) {
    if (group !== 'All' && e.muscle !== group) continue;
    if (gear !== 'all' && e.gear !== gear) continue;
    if (mechanic !== 'all' && e.mechanic !== mechanic) continue;
    if (have !== null && rank[e.equip] > have) continue;
    if (avoid && e.stress.some(s => avoid.has(s))) continue;

    const s = words.length ? score(e, words) : 0;
    if (s < 0) continue;
    hits.push({ e, s });
  }

  // With no query the catalogue is alphabetical, which is what you want when
  // you are browsing rather than looking for something in particular.
  hits.sort((a, b) => (words.length ? b.s - a.s : 0) || a.e.name.localeCompare(b.e.name));

  return { rows: hits.slice(0, limit).map(h => h.e), total: hits.length };
}

/** Everything that shares a family — the "see also" for an exercise. */
export const relatedTo = (ex, limit = 8) =>
  EXERCISES.filter(e => e.family === ex.family && e.id !== ex.id).slice(0, limit);

/** How many exercises each group has, for the filter chips. */
export function groupCounts(opts = {}) {
  return Object.fromEntries(
    GROUPS.map(g => [g, searchExercises({ ...opts, group: g, limit: Infinity }).total]));
}

export { GROUPS };
