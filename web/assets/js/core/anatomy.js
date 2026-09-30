/**
 * The muscles FEROX names, and the coarse groups they roll up into.
 *
 * Two levels, because two different things need naming:
 *
 *   `MUSCLES`      seven coarse groups. These drive the split builder, the
 *                  weekly-frequency rule, the focus breakdown and the medals,
 *                  and they must not change — the whole app keys off them.
 *   `ANATOMY`      the fine muscles, for saying what an exercise actually does
 *                  and for lighting up the body map.
 *
 * Every fine muscle belongs to exactly one coarse group, so an exercise's
 * `muscle` can always be derived from its primary movers rather than stored
 * twice and allowed to disagree.
 */

/** Coarse groups. Order matters — it is the order the UI lists them in. */
export const GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body'];

/**
 * id            stable, used in exercise data and in the body map's SVG
 * name          what a person calls it
 * group         the coarse group it rolls into
 * view          which side of the body map it appears on
 */
export const ANATOMY = [
  // chest
  { id: 'chest-upper', name: 'Upper chest',      group: 'Chest',     view: 'front' },
  { id: 'chest-mid',   name: 'Mid chest',        group: 'Chest',     view: 'front' },
  { id: 'chest-lower', name: 'Lower chest',      group: 'Chest',     view: 'front' },
  { id: 'serratus',    name: 'Serratus',         group: 'Chest',     view: 'front' },

  // back
  { id: 'lats',        name: 'Lats',             group: 'Back',      view: 'back' },
  { id: 'traps-upper', name: 'Upper traps',      group: 'Back',      view: 'back' },
  { id: 'traps-mid',   name: 'Mid traps',        group: 'Back',      view: 'back' },
  { id: 'rhomboids',   name: 'Rhomboids',        group: 'Back',      view: 'back' },
  { id: 'lower-back',  name: 'Lower back',       group: 'Back',      view: 'back' },
  { id: 'teres',       name: 'Teres major',      group: 'Back',      view: 'back' },

  // shoulders
  { id: 'front-delt',  name: 'Front delts',      group: 'Shoulders', view: 'front' },
  { id: 'side-delt',   name: 'Side delts',       group: 'Shoulders', view: 'front' },
  { id: 'rear-delt',   name: 'Rear delts',       group: 'Shoulders', view: 'back' },
  { id: 'rotator-cuff',name: 'Rotator cuff',     group: 'Shoulders', view: 'back' },

  // arms
  { id: 'biceps',      name: 'Biceps',           group: 'Arms',      view: 'front' },
  { id: 'brachialis',  name: 'Brachialis',       group: 'Arms',      view: 'front' },
  { id: 'triceps',     name: 'Triceps',          group: 'Arms',      view: 'back' },
  { id: 'forearms',    name: 'Forearms',         group: 'Arms',      view: 'front' },

  // core
  { id: 'abs',         name: 'Abs',              group: 'Core',      view: 'front' },
  { id: 'obliques',    name: 'Obliques',         group: 'Core',      view: 'front' },
  { id: 'deep-core',   name: 'Deep core',        group: 'Core',      view: 'front' },

  // legs
  { id: 'quads',       name: 'Quads',            group: 'Legs',      view: 'front' },
  { id: 'hamstrings',  name: 'Hamstrings',       group: 'Legs',      view: 'back' },
  { id: 'glutes',      name: 'Glutes',           group: 'Legs',      view: 'back' },
  { id: 'calves',      name: 'Calves',           group: 'Legs',      view: 'back' },
  { id: 'adductors',   name: 'Adductors',        group: 'Legs',      view: 'front' },
  { id: 'abductors',   name: 'Abductors',        group: 'Legs',      view: 'back' },
  { id: 'hip-flexors', name: 'Hip flexors',      group: 'Legs',      view: 'front' },
];

export const anatomyById = id => ANATOMY.find(m => m.id === id) ?? null;
export const groupOf = id => anatomyById(id)?.group ?? null;

/**
 * The coarse group an exercise belongs to, from its primary movers.
 *
 * A movement whose primaries span three groups is a full-body movement and is
 * labelled as one; otherwise the group that owns the most primaries wins.
 */
export function groupFor(primary = []) {
  const tally = {};
  for (const id of primary) {
    const g = groupOf(id);
    if (g) tally[g] = (tally[g] ?? 0) + 1;
  }
  const hits = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!hits.length) return 'Full body';
  if (hits.length >= 3) return 'Full body';
  return hits[0][0];
}
