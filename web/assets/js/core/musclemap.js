/**
 * The body map.
 *
 * A thousand exercises cannot each have an illustration drawn for them, and a
 * stock photo of a stranger mid-rep teaches nobody anything anyway. What people
 * actually want to know when they meet an unfamiliar movement is *what does
 * this work* — so that is what is drawn: a front and back figure with the
 * worked muscles lit up, primary movers solid and the helpers faded.
 *
 * It is one inline SVG per exercise, built from shared paths, so it costs no
 * network request, works offline, scales to any catalogue size and follows the
 * theme like everything else. Every colour is a token.
 *
 * The figure is deliberately simple. It is a diagram, not an anatomy plate: the
 * job is to make "this is a back exercise, and it also uses your biceps"
 * readable at 90 pixels.
 */
import { ANATOMY } from './anatomy.js';

/*
 * Region paths, drawn on a 100x220 grid per view. Coordinates are rounded to
 * whole numbers wherever the shape allows, because the whole file is shipped to
 * a phone and the decimals were not buying anything at this size.
 */
const FRONT = {
  head:          'M50 7c6.5 0 11.5 5 11.5 11.5v7C61.5 32 56.5 37 50 37s-11.5-5-11.5-11.5v-7C38.5 12 43.5 7 50 7z',
  neck:          'M45 34h10v8H45z',
  'traps-upper': 'M45 37 32 43c-2 1-2 3 0 4l16-4zM55 37l13 6c2 1 2 3 0 4l-16-4z',
  'chest-upper': 'M50 46c6 0 12 1 15 3l-1 6c-4-2-9-3-14-3s-10 1-14 3l-1-6c3-2 9-3 15-3z',
  'chest-mid':   'M49 55c5 0 10 1 14 3l-1 8c-4 2-9 3-13 3zM51 55c-5 0-10 1-14 3l1 8c4 2 9 3 13 3z',
  'chest-lower': 'M49 70c-4 0-9-1-12-3l1 6c3 2 7 3 11 3zM51 70c4 0 9-1 12-3l-1 6c-3 2-7 3-11 3z',
  serratus:      'M34 62c1 5 1 11 0 16l-4-4c-1-5-1-9 0-13zM66 62c-1 5-1 11 0 16l4-4c1-5 1-9 0-13z',
  'front-delt':  'M36 45c-5 0-10 2-12 7l-1 6c4 1 8 0 11-2l3-8zM64 45c5 0 10 2 12 7l1 6c-4 1-8 0-11-2l-3-8z',
  'side-delt':   'M24 52c-4 2-6 6-6 11l1 6 6-4 2-11zM76 52c4 2 6 6 6 11l-1 6-6-4-2-11z',
  biceps:        'M22 67c4 0 6 2 7 5l-2 13c-3 2-6 2-8 0l-1-14zM78 67c-4 0-6 2-7 5l2 13c3 2 6 2 8 0l1-14z',
  brachialis:    'M18 82l8 3-1 7-8-2zM82 82l-8 3 1 7 8-2z',
  forearms:      'M17 90c4 0 7 1 8 3l-3 19c-3 2-6 2-8 0l-1-19zM83 90c-4 0-7 1-8 3l3 19c3 2 6 2 8 0l1-19z',
  abs:           'M50 77c4 0 7 1 9 2v9h-9zM50 77c-4 0-7 1-9 2v9h9zM41 90h9v9h-9zM50 90h9v9h-9zM41 101h9v8l-6 1-3-4zM50 101h9v8l-6 1-3-4z',
  obliques:      'M39 79c-3 1-5 3-6 6l1 19c2 3 4 4 6 4zM61 79c3 1 5 3 6 6l-1 19c-2 3-4 4-6 4z',
  'deep-core':   'M43 100h14v11l-7 3-7-3z',
  'hip-flexors': 'M40 110c3 5 5 9 6 13l-7 1-3-10zM60 110c-3 5-5 9-6 13l7 1 3-10z',
  quads:         'M48 118c1 12 0 23-2 33l-9-1c-2-11-2-22-1-32zM52 118c-1 12 0 23 2 33l9-1c2-11 2-22 1-32z',
  adductors:     'M49 118c-1 8-1 17 0 25h2c1-8 1-17 0-25z',
  calves:        'M46 153c0 9-1 17-2 24l-6-1c-1-8-1-16-1-23zM54 153c0 9 1 17 2 24l6-1c1-8 1-16 1-23z',
  shin:          'M39 179h7l-1 21h-6zM61 179h-7l1 21h6z',
  hands:         'M14 112c4-1 7 0 8 2l-1 8c-3 2-6 2-8 0zM86 112c-4-1-7 0-8 2l1 8c3 2 6 2 8 0z',
  feet:          'M38 201h9v5h-9zM62 201h-9v5h9z',
};

const BACK = {
  head:          'M50 7c6.5 0 11.5 5 11.5 11.5v7C61.5 32 56.5 37 50 37s-11.5-5-11.5-11.5v-7C38.5 12 43.5 7 50 7z',
  neck:          'M45 34h10v8H45z',
  'traps-upper': 'M44 37 30 44c-2 1-2 4 1 5l11-3 8-6zM56 37l14 7c2 1 2 4-1 5l-11-3-8-6z',
  'traps-mid':   'M50 50c6 0 11 2 14 5l-3 14-11 3zM50 50c-6 0-11 2-14 5l3 14 11 3z',
  rhomboids:     'M50 55c4 0 8 1 10 3l-2 9-8 2zM50 55c-4 0-8 1-10 3l2 9 8 2z',
  lats:          'M38 60c1 10 1 20 0 29l-8-9c-1-8-1-15 1-20zM62 60c-1 10-1 20 0 29l8-9c1-8 1-15-1-20z',
  teres:         'M39 57c-3 1-5 3-6 5l6 4 2-7zM61 57c3 1 5 3 6 5l-6 4-2-7z',
  'rear-delt':   'M36 45c-5 0-10 2-12 7l-1 6c4 1 8 0 11-2l3-8zM64 45c5 0 10 2 12 7l1 6c-4 1-8 0-11-2l-3-8z',
  'rotator-cuff':'M35 47c3 0 6 1 7 3l-2 7c-3 0-6-1-7-3zM65 47c-3 0-6 1-7 3l2 7c3 0 6-1 7-3z',
  triceps:       'M22 65c4 0 6 2 7 5l-2 15c-3 2-6 2-8 0l-1-16zM78 65c-4 0-6 2-7 5l2 15c3 2 6 2 8 0l1-16z',
  forearms:      'M17 88c4 0 7 1 8 3l-3 21c-3 2-6 2-8 0l-1-21zM83 88c-4 0-7 1-8 3l3 21c3 2 6 2 8 0l1-21z',
  'lower-back':  'M50 88c5 0 9 1 11 3v13c-3 2-7 3-11 3zM50 88c-5 0-9 1-11 3v13c3 2 7 3 11 3z',
  glutes:        'M49 106c-5 0-10 2-12 5-2 5-1 10 2 13 4 2 8 1 10-2zM51 106c5 0 10 2 12 5 2 5 1 10-2 13-4 2-8 1-10-2z',
  abductors:     'M36 107c-3 1-4 4-4 8l1 8 5-4zM64 107c3 1 4 4 4 8l-1 8-5-4z',
  hamstrings:    'M48 125c1 11 0 21-2 30l-9-1c-2-10-2-20-1-29zM52 125c-1 11 0 21 2 30l9-1c2-10 2-20 1-29z',
  calves:        'M46 157c0 10-1 18-2 25l-7-1c-1-8-1-16 0-24zM54 157c0 10 1 18 2 25l7-1c1-8 1-16 0-24z',
  hands:         'M14 112c4-1 7 0 8 2l-1 8c-3 2-6 2-8 0zM86 112c-4-1-7 0-8 2l1 8c3 2 6 2 8 0z',
  feet:          'M37 202h10v5H37zM63 202H53v5h10z',
};

/** Parts of the figure that are never a muscle — drawn as inert body. */
const INERT = new Set(['head', 'neck', 'hands', 'feet', 'shin']);

/** The outline, so the figure reads as a person rather than floating shapes. */
const SILHOUETTE =
  'M50 5c7 0 12 5 12 12v7c0 4-1 7-3 9l13 6c5 2 9 6 10 12l3 20c1 5-1 9-4 10s-6-2-7-7l-2-13-1 16-2 19 1 30c0 6-1 11-2 16l-3 21c-1 4-3 6-6 6s-5-2-5-6l-2-28-2-19h-2l-2 19-2 28c0 4-2 6-5 6s-5-2-6-6l-3-21c-1-5-2-10-2-16l1-30-2-19-1-16-2 13c-1 5-4 8-7 7s-5-5-4-10l3-20c1-6 5-10 10-12l13-6c-2-2-3-5-3-9v-7c0-7 5-12 12-12z';

const isFront = id => ANATOMY.find(m => m.id === id)?.view === 'front';

function paths(view, primary, secondary) {
  const regions = view === 'front' ? FRONT : BACK;
  const prim = new Set(primary);
  const sec = new Set(secondary);

  return Object.entries(regions).map(([id, d]) => {
    if (INERT.has(id)) return `<path d="${d}" class="mm-inert"/>`;
    const cls = prim.has(id) ? 'mm-primary' : sec.has(id) ? 'mm-secondary' : 'mm-idle';
    return `<path d="${d}" class="${cls}"/>`;
  }).join('');
}

/**
 * One figure.
 * @param {'front'|'back'} view
 */
function figure(view, primary, secondary, { label = '' } = {}) {
  return `<svg class="musclemap" viewBox="0 0 100 214" role="img"
    aria-label="${label || `${view} view`}" preserveAspectRatio="xMidYMid meet">
    <path d="${SILHOUETTE}" class="mm-body"/>
    ${paths(view, primary, secondary)}
  </svg>`;
}

/**
 * The pair of figures for an exercise.
 *
 * Both views are always drawn, even when everything worked is on one side —
 * a body map that changes shape depending on the exercise is harder to read at
 * a glance than one that is always the same two figures with different parts
 * lit. The muscles are listed underneath because a diagram at this size can
 * show *where*, and only words can say *what it is called*.
 */
export function muscleMap(exercise, { size = 120, names = true } = {}) {
  if (!exercise) return '';
  const { primary = [], secondary = [] } = exercise;

  const wanted = [...primary, ...secondary];
  const front = wanted.some(isFront);
  const back = wanted.some(m => !isFront(m));

  return `<div class="musclemap-wrap" style="--mm-size:${size}px">
    <div class="musclemap-views">
      ${front || !back ? figure('front', primary, secondary, { label: `${exercise.name}, front` }) : ''}
      ${back ? figure('back', primary, secondary, { label: `${exercise.name}, back` }) : ''}
    </div>
    ${names ? muscleLegend(exercise) : ''}
  </div>`;
}

/** The written version of the same fact. */
export function muscleLegend({ primary = [], secondary = [] }) {
  const name = id => ANATOMY.find(m => m.id === id)?.name ?? id;
  return `<div class="mm-legend">
    <p><i class="mm-key mm-key-primary"></i>${primary.map(name).join(', ') || '—'}</p>
    ${secondary.length ? `<p><i class="mm-key mm-key-secondary"></i>${secondary.map(name).join(', ')}</p>` : ''}
  </div>`;
}

/** A single small figure, for a list row. Front unless the work is behind you. */
export function muscleChip(exercise, size = 34) {
  if (!exercise) return '';
  const view = exercise.primary?.some(isFront) ? 'front' : 'back';
  return `<span class="musclemap-chip" style="--mm-size:${size}px">
    ${figure(view, exercise.primary ?? [], exercise.secondary ?? [], { label: exercise.muscle })}
  </span>`;
}

export { FRONT, BACK };
