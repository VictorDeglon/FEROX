/**
 * Readiness icons — five states of one glyph.
 *
 * The slider used to show an emoji per score, which is a face, and a face is
 * the wrong symbol: it asks how you *feel about* training rather than how much
 * you have in the tank, and a grimace renders as a different grimace on every
 * platform. These are drawn here, so they look the same everywhere and say
 * the same thing everywhere.
 *
 * ## The symbol
 *
 * An ember, because that is this app's own vocabulary — FEROX trains in
 * seasons called Greek Fire and Winter Fire and its accent colour is named
 * ember. How much fire is in you is a question everybody already understands
 * the answer to without a legend.
 *
 * Every state is the same three parts, so they read as one scale rather than
 * five pictures:
 *
 *   core      the flame itself, growing from a flat coal to a full blaze
 *   branches  a symmetric pair either side, swinging from drooping at
 *             -52° through level at 0° to raised at +42°
 *   sparks    absent when depleted, appearing and multiplying as it climbs
 *
 * The branches are what make it a scale you can read at a glance even at
 * 24px, where the core's silhouette has stopped being legible: the *angle* of
 * two strokes survives any size, and it is the same cue as a pair of shoulders
 * slumped or squared.
 *
 * ## The motion
 *
 * Every state animates, and the motion is part of the meaning rather than
 * decoration — a guttering coal breathes slowly and unevenly, a blaze pulses
 * fast and throws sparks. All of it rides the `fx-*` classes already in
 * ferox.css, which means these inherit the shared duration tokens and are
 * switched off by `prefers-reduced-motion` in the same single place as
 * everything else.
 */

const wrap = (id, body, label) => `
  <svg class="ready-icon" viewBox="0 0 48 48" role="img" aria-label="${label}" fill="none">
    <defs>
      <!--
        userSpaceOnUse, not the default objectBoundingBox. A level branch is a
        horizontal stroke, its bounding box is zero pixels tall, and a vertical
        gradient over a zero-height box resolves to nothing — the branches
        simply disappeared at the middle of the scale, and only there.
        Anchoring the gradient to the 48-grid makes it independent of the
        shape it is painting.
      -->
      <linearGradient id="rg${id}" gradientUnits="userSpaceOnUse" x1="24" y1="40" x2="24" y2="6">
        <stop offset="0" stop-color="var(--ember-lo)"/>
        <stop offset=".55" stop-color="var(--ember)"/>
        <stop offset="1" stop-color="var(--ember-hi)"/>
      </linearGradient>
    </defs>${body}
  </svg>`;

/**
 * The symmetric pair.
 * @param {number} deg  negative droops, positive lifts
 * @param {number} len  how far out they reach
 * @param {number} op   how present they are
 */
const branches = (deg, len, op = 1, cls = '') => {
  const r = (deg * Math.PI) / 180;
  const dx = Math.cos(r) * len, dy = -Math.sin(r) * len;
  const stroke = `stroke="url(#rgX)" stroke-width="3" stroke-linecap="round" opacity="${op}"`;
  return `
    <g class="${cls}" style="transform-origin:24px 30px">
      <path d="M17 30 L${(17 - dx).toFixed(1)} ${(30 + dy).toFixed(1)}" ${stroke}/>
      <path d="M31 30 L${(31 + dx).toFixed(1)} ${(30 + dy).toFixed(1)}" ${stroke}/>
    </g>`;
};

const spark = (x, y, r, delay) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--ember-hi)" class="fx-ember" style="--d:${delay}"/>`;

/**
 * Five states, lowest to highest. Keyed to `READINESS[].key` in core/split.js.
 *
 * Each is the same anatomy with three dials turned: how tall the core stands,
 * which way the branches point, and how much is coming off the top.
 */
const STATES = {
  /* Wrecked — a coal, not a flame. Flat, cold at the edges, barely moving. */
  wrecked: id => wrap(id, `
    ${branches(-52, 9, 0.5)}
    <g class="fx-pulse-soft fx-slow" style="transform-origin:24px 32px">
      <path d="M18 34c0-3 2.6-4.6 6-4.6s6 1.6 6 4.6-2.6 4.4-6 4.4-6-1.4-6-4.4Z"
        fill="url(#rg${id})" opacity=".85"/>
    </g>
    <path d="M20.5 32.5c1.2-1.1 2.3-1.1 3.5 0s2.3 1.1 3.5 0"
      stroke="var(--ember-hi)" stroke-width="1.6" stroke-linecap="round"
      opacity=".55" class="fx-drift"/>`,
    'Wrecked — almost nothing left'),

  /* Rough — a low flame that cannot hold steady. */
  rough: id => wrap(id, `
    ${branches(-28, 10, 0.7)}
    <g class="fx-flicker" style="transform-origin:24px 34px">
      <path d="M24 20c4.5 4 7 7.3 7 10.6 0 4-3.1 6.9-7 6.9s-7-2.9-7-6.9c0-2.4 1.4-4.7 3.6-7.1"
        fill="url(#rg${id})"/>
    </g>`,
    'Rough — running on fumes'),

  /* Okay — upright, level, unremarkable. The middle of the scale. */
  okay: id => wrap(id, `
    ${branches(6, 11, 0.9)}
    <g class="fx-pulse-soft" style="transform-origin:24px 33px">
      <path d="M24 14c6 5.4 9 9.6 9 13.8 0 5-4 8.7-9 8.7s-9-3.7-9-8.7c0-3.1 1.8-6.1 4.7-9.2"
        fill="url(#rg${id})"/>
      <path d="M24 24.5c2.2 2.2 3.3 3.8 3.3 5.4 0 2-1.5 3.4-3.3 3.4s-3.3-1.4-3.3-3.4c0-1.2.7-2.4 2-3.8"
        fill="var(--ember-hi)" opacity=".5"/>
    </g>`,
    'Okay — a normal day'),

  /* Good — taller, lifting, throwing the first sparks. */
  good: id => wrap(id, `
    ${branches(26, 12, 0.95)}
    <g class="fx-flicker" style="transform-origin:24px 33px">
      <path d="M24 9c7 6.2 10.5 11 10.5 15.9 0 5.8-4.7 10.1-10.5 10.1S13.5 30.7 13.5 24.9c0-3.6 2.1-7.1 5.5-10.7"
        fill="url(#rg${id})"/>
      <path d="M24 21c2.8 2.7 4.2 4.7 4.2 6.7 0 2.5-1.9 4.3-4.2 4.3s-4.2-1.8-4.2-4.3c0-1.5.9-3 2.6-4.8"
        fill="var(--ember-hi)" opacity=".65" class="fx-flicker-core"/>
    </g>
    ${spark(15, 15, 1.4, '0s')}
    ${spark(33, 12, 1.2, '1.6s')}`,
    'Good — ready to work'),

  /* Primed — everything open, everything lit, sparks on all sides. */
  primed: id => wrap(id, `
    ${branches(42, 14, 1, 'fx-pulse-soft')}
    <g class="fx-flicker" style="transform-origin:24px 32px">
      <path d="M24 5c8.2 7 12.3 12.6 12.3 18.2 0 6.7-5.5 11.6-12.3 11.6S11.7 29.9 11.7 23.2c0-4.1 2.5-8.1 6.4-12.2"
        fill="url(#rg${id})"/>
      <path d="M24 18c3.4 3.2 5 5.6 5 7.9 0 3-2.2 5.1-5 5.1s-5-2.1-5-5.1c0-1.8 1-3.6 3-5.7"
        fill="var(--ember-hi)" class="fx-flicker-core"/>
    </g>
    ${spark(11, 14, 1.5, '0s')}
    ${spark(37, 11, 1.3, '1.1s')}
    ${spark(18, 7, 1.1, '2.2s')}
    ${spark(31, 19, 1, '3.1s')}`,
    'Primed — everything is there'),
};

/**
 * The icon for a 1–10 score.
 *
 * Ten scores, five states, so each covers two — which is also exactly how
 * `readinessFor` buckets them in core/split.js. Keeping both derived from the
 * same thresholds is why the picture can never disagree with the label
 * underneath it.
 */
export function readinessIcon(score, key = null) {
  const k = key ?? (score <= 2 ? 'wrecked' : score <= 4 ? 'rough'
    : score <= 6 ? 'okay' : score <= 8 ? 'good' : 'primed');
  const make = STATES[k] ?? STATES.okay;
  // The gradient id has to be unique per rendered icon, or two on one page
  // both resolve to whichever was defined last.
  return make(k).replace(/rgX/g, `rg${k}`);
}

export const READINESS_STATES = Object.keys(STATES);
