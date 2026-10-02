/**
 * Seasonal decoration.
 *
 * October gets autumn: a vine of leaves hanging around the large avatar
 * frames, and a pumpkin tucked against the rim. It appears on the 1st and is
 * gone on the 1st of November, every year, with nothing to remember to switch
 * off — the only state involved is the date.
 *
 * ## Why it is drawn rather than dropped in
 *
 * Emoji would have been one line and would have looked like one line: 🍁
 * renders as a different leaf on every platform and cannot be tinted, posed
 * or animated. These are real paths — maple, oak and beech, each with its own
 * lobes and veins — so they take the brand palette, hang at believable
 * angles, and move independently.
 *
 * ## Restraint
 *
 * It decorates the *frame*, never the photograph. Nothing is drawn inside the
 * circle, nothing covers a face, and the whole thing sits behind the avatar
 * in the stacking order. The motion is a slow sway on a long loop — this is
 * in somebody's peripheral vision while they read their own numbers, and the
 * failure mode of seasonal decoration is being noticed more than the content
 * it is decorating.
 *
 * Switched off entirely by `prefers-reduced-motion` for the movement, and by
 * the profile's own setting for the lot.
 */

/* ------------------------------------------------------------- the clock */

/**
 * October, in the viewer's own time zone.
 *
 * Local rather than UTC on purpose: somebody in Auckland should see it on
 * their 1st of October, not thirteen hours late, and lose it on their 1st of
 * November rather than part-way through Halloween night.
 */
export function isAutumn(now = new Date()) {
  return now.getMonth() === 9;              // 0-indexed: 9 is October
}

/** Which decoration applies today, or null. Room for more seasons later. */
export function seasonalTheme(now = new Date()) {
  return isAutumn(now) ? 'autumn' : null;
}

/* -------------------------------------------------------------- the art */

/**
 * Three leaves, drawn properly, each on a 24×24 grid with its stem at the
 * top so it hangs from a point.
 *
 * The veins are a separate stroked path rather than part of the silhouette,
 * so they can sit at a lower opacity and the leaf still reads as one shape
 * at 14 pixels.
 */
const LEAVES = {
  maple: {
    fill: 'M12 2.4c.5 1.9.2 3.2-.8 4.3 1.2-.3 2.2-1 3-2.1.2 1.4-.1 2.5-.8 3.5 1.5-.5 2.7-.4 3.9.3-.9.9-1.5 1.8-1.7 2.9 1.5-.6 2.9-.5 4.3.3-1.3.8-2.1 1.7-2.5 2.9 1.2.1 2.2.5 3.1 1.3-1.6.6-3.1.9-4.6.8.4.9.4 1.8.1 2.8-1.2-.7-2.3-1.1-3.4-1.2.1 1.4.4 2.6 1 3.7l-1.6-.5-.8 2.2-.8-2.2-1.6.5c.6-1.1.9-2.3 1-3.7-1.1.1-2.2.5-3.4 1.2-.3-1-.3-1.9.1-2.8-1.5.1-3-.2-4.6-.8.9-.8 1.9-1.2 3.1-1.3-.4-1.2-1.2-2.1-2.5-2.9 1.4-.8 2.8-.9 4.3-.3-.2-1.1-.8-2-1.7-2.9 1.2-.7 2.4-.8 3.9-.3-.7-1-1-2.1-.8-3.5.8 1.1 1.8 1.8 3 2.1-1-1.1-1.3-2.4-.8-4.3Z',
    vein: 'M12 21.5V8M12 13l-3.4-2.6M12 13l3.4-2.6M12 16.8l-2.4-1.8M12 16.8l2.4-1.8',
  },
  oak: {
    fill: 'M12 2.6c1.6 0 2.4 1 2.4 2.2.9-.5 2-.2 2.4.8.4 1-.1 1.9-1 2.3 1.1.1 1.9.9 1.9 1.9s-.8 1.8-1.8 1.9c1 .4 1.5 1.4 1.1 2.4-.4 1-1.5 1.4-2.5 1 .2 1.1-.5 2.1-1.6 2.4-.4.1-.7.1-1 0l-.4 4.1h-.6l-.4-4.1c-.3.1-.7.1-1 0-1.1-.3-1.8-1.3-1.6-2.4-1 .4-2.1 0-2.5-1-.4-1 .1-2 1.1-2.4-1-.1-1.8-.9-1.8-1.9s.8-1.8 1.9-1.9c-.9-.4-1.4-1.3-1-2.3.4-1 1.5-1.3 2.4-.8 0-1.2.8-2.2 2.4-2.2Z',
    vein: 'M12 21.5V4.5M12 9l-2.6-1.4M12 9l2.6-1.4M12 13.5l-2.8-1.6M12 13.5l2.8-1.6',
  },
  beech: {
    fill: 'M12 2.5c3.6 2.6 5.6 6 5.6 9.4 0 3.6-2.5 6.4-5.6 7.2-3.1-.8-5.6-3.6-5.6-7.2 0-3.4 2-6.8 5.6-9.4Z',
    vein: 'M12 21.5V4M12 8.5l-3 1.2M12 8.5l3 1.2M12 12.5l-3.4 1.4M12 12.5l3.4 1.4M12 16l-2.6 1.1M12 16l2.6 1.1',
  },
};

/** Autumn, warm to deep. Independent of the user's palette, deliberately. */
const AUTUMN = ['#D94F1E', '#E8761F', '#C0392B', '#B5651D', '#8E3B1F', '#E0A020'];

/**
 * Where each leaf hangs.
 *
 * Clustered at the top and spilling down one side rather than ringed evenly:
 * a wreath looks like a wreath, and the brief was a vine. `t` is the position
 * around the circle in turns from 12 o'clock, `drop` is how far below the rim
 * it dangles, `tilt` the resting angle.
 */
const HANGING = [
  { kind: 'maple', t: -0.275, drop: 18, size: 0.22, tilt: -76, delay: 1.9 },
  { kind: 'maple', t: -0.235, drop: 13, size: 0.26, tilt: -62, delay: 2.4 },
  { kind: 'oak', t: -0.195, drop: 19, size: 0.21, tilt: -54, delay: 0.5 },
  { kind: 'maple', t: -0.155, drop: 14, size: 0.29, tilt: -44, delay: 3.4 },
  { kind: 'beech', t: -0.12, drop: 20, size: 0.20, tilt: -34, delay: 1.1 },
  { kind: 'maple', t: -0.085, drop: 13, size: 0.31, tilt: -26, delay: 0 },
  { kind: 'oak', t: -0.05, drop: 19, size: 0.23, tilt: -16, delay: 2.9 },
  { kind: 'beech', t: -0.015, drop: 13, size: 0.21, tilt: -4, delay: 1.6 },
  { kind: 'maple', t: 0.02, drop: 20, size: 0.27, tilt: 8, delay: 3.1 },
  { kind: 'oak', t: 0.055, drop: 14, size: 0.24, tilt: 20, delay: 0.8 },
  { kind: 'beech', t: 0.09, drop: 20, size: 0.19, tilt: 32, delay: 2.1 },
  { kind: 'maple', t: 0.125, drop: 14, size: 0.28, tilt: 44, delay: 1.3 },
  { kind: 'oak', t: 0.165, drop: 20, size: 0.22, tilt: 56, delay: 3.7 },
  { kind: 'beech', t: 0.205, drop: 14, size: 0.20, tilt: 68, delay: 0.3 },
];

/**
 * The decoration for an avatar of `size` pixels.
 *
 * Returns an SVG positioned absolutely over a wrapper, with `pointer-events:
 * none` so it never eats a click meant for the picture underneath. The
 * viewBox is padded well past the circle because the leaves and the stalk of
 * the pumpkin hang outside it.
 *
 * @param {number} size   the avatar's diameter in CSS pixels
 * @param {string} seed   anything stable, so one page's frames differ
 */
export function autumnFrame(size = 96, seed = '') {
  const PAD = 40;                       // room for the overhang
  const box = 100 + PAD * 2;
  const c = box / 2;
  const r = 50;

  // A stable per-frame offset, so two avatars on a page are not identical
  // without anything being random between renders.
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const jitter = ((h >>> 0) % 100) / 100;

  const uid = `au${(h >>> 0).toString(36)}`;

  const leaves = HANGING.map((l, i) => {
    const turn = l.t + (jitter - 0.5) * 0.04;
    const a = turn * Math.PI * 2 - Math.PI / 2;     // from 12 o'clock
    const x = c + Math.cos(a) * (r + l.drop);
    const y = c + Math.sin(a) * (r + l.drop);
    const s = l.size * 1.55;
    const colour = AUTUMN[(i + Math.floor(jitter * 6)) % AUTUMN.length];

    // Each leaf is its own group so the sway has its own origin — at the
    // stem, which is how a leaf actually moves on a stalk.
    return `
      <g class="au-leaf" style="transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px;
         animation-delay:${l.delay}s">
        <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${l.tilt}) scale(${s.toFixed(3)}) translate(-12 -2)"
           opacity=".78">
          <path d="${LEAVES[l.kind].fill}" fill="${colour}"/>
          <path d="${LEAVES[l.kind].vein}" stroke="rgb(0 0 0 / .22)" stroke-width=".9"
            stroke-linecap="round" fill="none"/>
        </g>
      </g>`;
  }).join('');

  /*
   * The vine itself: one arc hugging the top of the circle, drawn slightly
   * outside it so it reads as sitting on the rim rather than cutting across.
   */
  const vine = `
    <path d="M${(c - r - 13).toFixed(1)} ${(c + 4).toFixed(1)}
             A ${r + 13} ${r + 13} 0 0 1 ${(c + r + 13).toFixed(1)} ${(c + 10).toFixed(1)}"
      fill="none" stroke="#6B4A2B" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;

  /*
   * A carved jack-o-lantern at the bottom right, sitting on the rim.
   *
   * Drawn rather than dropped in, like the leaves, but this one earns the
   * detail: the ridges are separate ellipses at different opacities so the
   * gourd reads as round rather than flat, the cut faces glow from a
   * gradient instead of a flat fill, and the stem has the curl and the vine
   * tendril that make it a jack-o-lantern rather than an orange circle. The
   * eyes and the jagged grin are single paths, which is what keeps it
   * legible at thirty pixels across.
   */
  const pa = 0.145 * Math.PI * 2;        // down from 3 o'clock: the lower right
  const px = c + Math.cos(pa) * (r - 4);
  const py = c + Math.sin(pa) * (r - 4);
  const gid = `${uid}g`;
  const pumpkin = `
    <g class="au-pumpkin" style="transform-origin:${px.toFixed(1)}px ${py.toFixed(1)}px">
      <g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(1.05) translate(-24 -26)">
        <path d="M24 15c-1.4-3.2-1-6 1.4-8.4-1.6.3-3 1.1-4 2.5-.9-1.5-2.4-2.4-4.3-2.6 1.9 2.2 2.6 5 2.2 8.5"
          fill="#7A4A22" stroke="#2B1608" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M28 9.8c2.6-1.9 5-1.6 5.6.6.5 1.9-1.4 3-2.6 2-1-.8-.4-2.2.8-2"
          fill="none" stroke="#5E7A33" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M14.5 12.5c-2.4-1.6-4.6-1.4-5.4.6 1.9.5 3.6.2 5-.8Z" fill="#5E7A33"/>
        <path d="M33.5 13.2c2.3-1.4 4.4-1.1 5.2.8-1.8.5-3.5.2-4.8-.7Z" fill="#5E7A33"/>

        <ellipse cx="24" cy="31" rx="18" ry="15.5" fill="#D9601C"
          stroke="#2B1608" stroke-width="1.7"/>
        <ellipse cx="13.5" cy="31" rx="6.4" ry="14.6" fill="#B64A14" opacity=".5"/>
        <ellipse cx="34.5" cy="31" rx="6.4" ry="14.6" fill="#B64A14" opacity=".5"/>
        <ellipse cx="24" cy="31" rx="8.2" ry="15.3" fill="#F0792A" opacity=".7"/>
        <ellipse cx="24" cy="31" rx="2.8" ry="15.1" fill="#FF8C38" opacity=".5"/>

        <path d="M12.8 25 21.5 30.4 12.8 32.4Z" fill="url(#${gid})"/>
        <path d="M35.2 25 26.5 30.4 35.2 32.4Z" fill="url(#${gid})"/>
        <path d="M24 30.2l3.1 4.8h-6.2Z" fill="url(#${gid})"/>
        <path d="M13.6 37.2l3.4 3 2.5-3 2.9 3.2 2.5-3.2 2.9 3.2 2.5-3.2 3.2 2.9 1.2-2.9
                 -2.3 5.6-3.5-2.5-2.3 2.8-2.9-2.8-2.5 2.8-2.9-2.8-2.5 2.5Z" fill="url(#${gid})"/>
      </g>
    </g>`;

  /*
   * Two layers, because they sit on opposite sides of the avatar.
   *
   * Leaves hang *behind* the circle — anything drawn over a face is a
   * decoration that has stopped decorating. The pumpkin deliberately laps
   * over the rim, which only reads as overlapping if it is in front, so it
   * gets its own layer above. Same viewBox, so the coordinates in both are
   * the same ones.
   */
  const layer = (cls, body) => `
    <svg class="${cls}" viewBox="0 0 ${box} ${box}" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="${uid}" cx=".5" cy=".5" r=".5">
          <stop offset=".72" stop-color="rgb(217 79 30 / 0)"/>
          <stop offset="1" stop-color="rgb(217 79 30 / .13)"/>
        </radialGradient>
        <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFE48A"/>
          <stop offset="1" stop-color="#FFA81F"/>
        </linearGradient>
      </defs>${body}
    </svg>`;

  return layer('au-frame', `
      <circle cx="${c}" cy="${c}" r="${r + 16}" fill="url(#${uid})"/>
      ${vine}${leaves}`)
    + layer('au-front', pumpkin);
}

/** Unused once the two-layer version above returns; kept out of the way. */
function _legacyFrame({ box, uid, c, r, vine, leaves, pumpkin }) {
  return `
    <svg class="au-frame" viewBox="0 0 ${box} ${box}" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="${uid}" cx=".5" cy=".5" r=".5">
          <stop offset=".72" stop-color="rgb(217 79 30 / 0)"/>
          <stop offset="1" stop-color="rgb(217 79 30 / .13)"/>
        </radialGradient>
        <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFE48A"/>
          <stop offset="1" stop-color="#FFA81F"/>
        </linearGradient>
      </defs>
      <circle cx="${c}" cy="${c}" r="${r + 16}" fill="url(#${uid})"/>
      ${vine}${leaves}${pumpkin}
    </svg>`;
}

/**
 * Wrap an avatar in whatever this month calls for.
 *
 * Returns the markup unchanged outside the season and when the athlete has
 * turned it off, so every caller can use it unconditionally and no page needs
 * to know what month it is.
 *
 * @param {string} inner  the avatar markup
 * @param {number} size   its diameter in pixels
 */
export function decorate(inner, size = 96, { enabled = true, seed = '', now = new Date() } = {}) {
  if (!enabled || seasonalTheme(now) !== 'autumn' || size < 56) return inner;
  return `<span class="au-wrap" style="--au-size:${size}px">${inner}${autumnFrame(size, seed)}</span>`;
}
