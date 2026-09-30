#!/usr/bin/env node
/**
 * Expand the exercise families into the shipped catalogue.
 *
 *   node scripts/gen-exercises.js
 *
 * Writes web/assets/js/core/exercises.js. Everything in it is derived, so the
 * file is never edited by hand — change `scripts/data/families.js` and re-run.
 *
 * Generating rather than hand-writing is the only way a catalogue this size
 * stays consistent: typed out one row at a time, the same movement ends up with
 * two different muscle lists depending on which afternoon it was added.
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES, GEAR } from './data/families.js';
import { ANATOMY, GROUPS, groupFor } from './data/anatomy.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** `Incline Barbell Bench Press` -> `incline-barbell-bench-press` */
const slug = s => s.toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

/** How each implement is written into a name. */
const IMPLEMENT_NAME = {
  barbell: 'Barbell', ezbar: 'EZ-Bar', trapbar: 'Trap Bar', landmine: 'Landmine',
  dumbbell: 'Dumbbell', kettlebell: 'Kettlebell', cable: 'Cable', machine: 'Machine',
  smith: 'Smith Machine', band: 'Band', bodyweight: '', bar: '', bench: '',
  plyo: '', box: '', cardio: '', outdoor: '', other: '',
};

const seen = new Map();
const out = [];

function add(ex) {
  if (seen.has(ex.id)) {
    // Two families producing the same name is a data bug, not something to
    // silently de-duplicate — it means a movement is defined in two places
    // with two sets of muscles.
    const prev = seen.get(ex.id);
    if (prev.family !== ex.family) {
      console.warn(`  duplicate: "${ex.name}" from both ${prev.family} and ${ex.family}`);
    }
    return;
  }
  seen.set(ex.id, ex);
  out.push(ex);
}

function build(fam, { name, im, primary, secondary, stress, kind, unit, pattern, loadClass, variant = 1 }) {
  const g = GEAR[im];
  if (!g) throw new Error(`${fam.id}: unknown implement "${im}"`);

  const prim = primary ?? fam.primary;
  const sec = (secondary ?? fam.secondary).filter(m => !prim.includes(m));
  const k = kind ?? fam.kind ?? 'strength';
  const u = unit ?? fam.unit ?? (g.gear === 'bodyweight' || g.gear === 'plyo' ? 'bw' : 'kg');

  for (const m of [...prim, ...sec]) {
    if (!ANATOMY.some(a => a.id === m)) throw new Error(`${name}: unknown muscle "${m}"`);
  }

  return {
    id: slug(name),
    name,
    muscle: groupFor(prim),
    primary: prim,
    secondary: sec,
    kind: k,
    unit: u,
    equip: g.equip,
    gear: g.gear,
    pattern: pattern ?? fam.pattern,
    mechanic: fam.mechanic,
    force: fam.force,
    stress: stress ?? fam.stress ?? [],
    family: fam.id,
    loadClass: u === 'kg' ? (loadClass ?? fam.loadClass ?? null) : null,
    /*
     * How far this is from the plain version of the movement: 0 for
     * "Barbell Bench Press", 1 for "Incline Barbell Bench Press", 2 for
     * "Incline Neutral-Grip Dumbbell Bench Press".
     *
     * Search needs it. Without it, ranking on name length alone put "Dead
     * Bench Press" above "Barbell Bench Press" — both are barbell compounds
     * that match the word, and the wrong one is shorter.
     */
    variant,
  };
}

for (const fam of FAMILIES) {
  /*
   * A family may declare several grids. One grid per family was not enough:
   * `implements x angles` on the squat produced "Goblet Barbell Squat" and
   * "Back Dumbbell Squat", neither of which is a thing anyone does. A grid is
   * only allowed to exist when every cell of it is real, so a movement whose
   * angles depend on the implement needs one grid per implement group.
   */
  const grids = fam.grids ?? [{ implements: fam.implements, angles: fam.angles, grips: fam.grips, base: fam.base }];
  for (const grid of grids) {
    const angles = grid.angles ?? [''];
    const grips = grid.grips ?? [''];
    const base = grid.base ?? fam.base;
    for (const im of grid.implements ?? []) {
      for (const angle of angles) {
        for (const grip of grips) {
          const name = [angle, grip, IMPLEMENT_NAME[im], base]
            .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
          // `plain` names the value of an axis that is the default form of the
          // movement rather than a variation of it. A back squat is *the*
          // barbell squat, so it should rank like one.
          const variant = (angle && angle !== grid.plain ? 1 : 0)
                        + (grip && grip !== grid.plainGrip ? 1 : 0);
          add(build(fam, { name, im, variant, ...(grid.with ?? {}) }));
        }
      }
    }
  }
  for (const extra of fam.extras ?? []) {
    // An extra that is simply the movement itself — "Push-Up", "Plank",
    // "Deadlift" — is as canonical as a grid's plain cell.
    const plain = extra.name === fam.base
      || extra.name === `${IMPLEMENT_NAME[extra.im]} ${fam.base}`.trim();
    add(build(fam, { variant: plain ? 0 : 1, ...extra }));
  }
}

out.sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name));

/* ------------------------------------------------------------------ report */

const by = key => out.reduce((t, e) => (t[e[key]] = (t[e[key]] ?? 0) + 1, t), {});
console.log(`${out.length} exercises from ${FAMILIES.length} families\n`);
const table = (label, counts) => {
  console.log(label);
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(k || '—').padEnd(14)} ${String(v).padStart(5)}`);
  }
  console.log();
};
table('by group', by('muscle'));
table('by gear', by('gear'));
table('by kind', by('kind'));

const loadable = out.filter(e => e.unit === 'kg');
const noClass = loadable.filter(e => !e.loadClass);
if (noClass.length) {
  console.warn(`⚠ ${noClass.length} loaded exercises have no loadClass — they would open at zero:`);
  for (const e of noClass.slice(0, 10)) console.warn(`    ${e.name}`);
}

/* ------------------------------------------------------------------- write */

/*
 * Written as columns of dictionary indices rather than a thousand JSON objects.
 *
 * The readable version is 322 KB, which is a lot of bytes to push down a phone
 * connection and a lot of string allocation to do on every page load of an app
 * whose whole promise is that it works offline. Encoded this way it is a
 * quarter of that, and the decoder at the bottom of the generated file hands
 * back exactly the same objects.
 *
 * `id` is not stored at all — it is the slug of the name, derived on load by
 * the same function that made it here.
 */
const dict = key => {
  const values = [...new Set(out.flatMap(e => (Array.isArray(e[key]) ? e[key] : [e[key]])))]
    .filter(v => v !== null && v !== undefined).sort();
  return { values, index: new Map(values.map((v, i) => [v, i])) };
};

const COLS = ['muscle', 'kind', 'unit', 'equip', 'gear', 'pattern', 'mechanic', 'force', 'family', 'loadClass', 'variant'];
const LIST_COLS = ['primary', 'secondary', 'stress'];

const dicts = Object.fromEntries([...COLS, 'primary'].map(k => [k, dict(k)]));
// One muscle dictionary shared by primary, secondary and the body map.
const muscles = dicts.primary;
for (const e of out) {
  for (const m of [...e.secondary, ...e.stress]) {
    if (!muscles.index.has(m)) { muscles.index.set(m, muscles.values.length); muscles.values.push(m); }
  }
}

const rows = out.map(e => [
  e.name,
  ...COLS.map(k => (e[k] === null || e[k] === undefined ? -1 : dicts[k].index.get(e[k]))),
  ...LIST_COLS.map(k => e[k].map(v => muscles.index.get(v))),
]);

const file = `/**
 * The exercise catalogue — ${out.length} movements across ${FAMILIES.length} families.
 *
 * GENERATED by scripts/gen-exercises.js from scripts/data/families.js.
 * Do not edit by hand; change the families and re-run.
 *
 * Stored as columns of dictionary indices and decoded on import. Written out
 * as objects it is over 300 KB, which is a lot of bytes and a lot of string
 * allocation for an app that promises to work offline on a phone. Each decoded
 * entry carries:
 *
 *   id         stable slug of the name — logged sessions reference it, so a
 *              rename is a breaking change
 *   muscle     coarse group, derived from the primary movers
 *   primary    the muscles that do the work    secondary  the ones that help
 *   kind       strength | time | cardio        unit       kg | bw | sec | km
 *   equip      the LEAST kit it needs          gear       the implement
 *   pattern    movement pattern, for the split builder
 *   mechanic   compound | isolation            force      push | pull | static
 *   stress     joints it loads, so limitations can filter it out
 *   loadClass  which strength standard prices it — see core/strength.js
 */

const D = ${JSON.stringify({
  muscle: dicts.muscle.values, kind: dicts.kind.values, unit: dicts.unit.values,
  equip: dicts.equip.values, gear: dicts.gear.values, pattern: dicts.pattern.values,
  mechanic: dicts.mechanic.values, force: dicts.force.values,
  family: dicts.family.values, loadClass: dicts.loadClass.values,
  variant: dicts.variant.values,
  m: muscles.values,
})};

const R = ${JSON.stringify(rows).replace(/\],\[/g, '],\n[')};

/** Must match the slug used by scripts/gen-exercises.js, or ids drift. */
const slug = s => s.toLowerCase().replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pick = (list, i) => (i < 0 ? null : list[i]);
const names = idx => idx.map(i => D.m[i]);

export const EXERCISE_CATALOGUE = R.map(r => ({
  id: slug(r[0]),
  name: r[0],
  muscle: D.muscle[r[1]],
  kind: D.kind[r[2]],
  unit: D.unit[r[3]],
  equip: D.equip[r[4]],
  gear: D.gear[r[5]],
  pattern: D.pattern[r[6]],
  mechanic: D.mechanic[r[7]],
  force: D.force[r[8]],
  family: D.family[r[9]],
  loadClass: pick(D.loadClass, r[10]),
  variant: D.variant[r[11]],
  primary: names(r[12]),
  secondary: names(r[13]),
  stress: names(r[14]),
}));
`;

await writeFile(join(root, 'web', 'assets', 'js', 'core', 'exercises.js'), file);
console.log(`wrote web/assets/js/core/exercises.js  (${(file.length / 1024).toFixed(0)} KB)`);
