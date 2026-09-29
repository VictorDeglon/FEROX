/**
 * Animated season icons.
 *
 * Each returns a self-contained SVG string carrying its own gradient (keyed by
 * season id so several can share a page). Motion is driven by classes whose
 * keyframes live in ferox.css, which means `prefers-reduced-motion` switches
 * every one of them off in a single place.
 *
 * All are drawn on a 48×48 grid and scale from a 24px list row to a 96px hero.
 */

const grad = (id, from, to, vertical = true) => `
  <linearGradient id="${id}" x1="0" y1="${vertical ? 0 : 0}" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient>`;

const wrap = (id, defs, body, label) => `
  <svg class="season-icon" viewBox="0 0 48 48" role="img" aria-label="${label}" fill="none">
    <defs>${defs}</defs>${body}
  </svg>`;

const ICONS = {
  /* Greek Fire — a flame that flickers, with embers lifting off it. */
  flame: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <g class="fx-flicker" style="transform-origin:24px 34px">
      <path d="M24 6c1.5 6.5 7 9 9 14.5 2.8 4.8 1.4 11.2-2.6 14.6-2 1.7-4.3 2.6-6.4 2.6s-4.4-.9-6.4-2.6c-4-3.4-5.4-9.8-2.6-14.6C17 15 22.5 12.5 24 6Z"
        fill="url(#g${id})"/>
      <path d="M24 20c.9 3.4 4 4.6 4.4 8 .4 3.3-1.8 6-4.4 6s-4.8-2.7-4.4-6c.4-3.4 3.5-4.6 4.4-8Z"
        fill="#FFE9B0" opacity=".85" class="fx-flicker-core" style="transform-origin:24px 30px"/>
    </g>
    <circle cx="16" cy="18" r="1.5" fill="${a}" class="fx-ember" style="--d:0s"/>
    <circle cx="32" cy="22" r="1.2" fill="${a}" class="fx-ember" style="--d:1.1s"/>
    <circle cx="27" cy="14" r="1" fill="${a}" class="fx-ember" style="--d:2.2s"/>`,
    'Greek Fire'),

  /* Winter Fire — the same flame, run cold, with crystal shards drifting. */
  coldflame: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <g class="fx-flicker fx-slow" style="transform-origin:24px 34px">
      <path d="M24 6c1.5 6.5 7 9 9 14.5 2.8 4.8 1.4 11.2-2.6 14.6-2 1.7-4.3 2.6-6.4 2.6s-4.4-.9-6.4-2.6c-4-3.4-5.4-9.8-2.6-14.6C17 15 22.5 12.5 24 6Z"
        fill="url(#g${id})"/>
      <path d="M24 19v16M18.5 23l11 8M29.5 23l-11 8" stroke="#EAF6FF" stroke-width="2"
        stroke-linecap="round" opacity=".9" class="fx-pulse-soft" style="transform-origin:24px 27px"/>
    </g>
    <path d="M13 14l1.6 1.6M34 18l1.6 1.6" stroke="${a}" stroke-width="2" stroke-linecap="round" class="fx-drift" style="--d:0s"/>
    <path d="M31 10l1.4 1.4" stroke="${a}" stroke-width="2" stroke-linecap="round" class="fx-drift" style="--d:1.5s"/>`,
    'Winter Fire'),

  /* Recomp — two arrows chasing each other: muscle up, fat down, at once. */
  recomp: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <g class="fx-spin" style="transform-origin:24px 24px">
      <path d="M24 8a16 16 0 0 1 15.2 11" stroke="url(#g${id})" stroke-width="4" stroke-linecap="round"/>
      <path d="M40 9v10.5H29.5" stroke="url(#g${id})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 40A16 16 0 0 1 8.8 29" stroke="${b}" stroke-width="4" stroke-linecap="round"/>
      <path d="M8 39V28.5h10.5" stroke="${b}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <circle cx="24" cy="24" r="4" fill="${a}" class="fx-pulse-soft" style="transform-origin:24px 24px"/>`,
    'FEROX Recomp'),

  /* Foundation — blocks stacking up, one after another. */
  foundation: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <rect x="8"  y="32" width="32" height="8" rx="2.5" fill="url(#g${id})" class="fx-stack" style="--d:0s"/>
    <rect x="12" y="22" width="24" height="8" rx="2.5" fill="url(#g${id})" class="fx-stack" style="--d:.28s" opacity=".85"/>
    <rect x="16" y="12" width="16" height="8" rx="2.5" fill="url(#g${id})" class="fx-stack" style="--d:.56s" opacity=".7"/>`,
    'Foundation'),

  /* Iron Base — a plate turning slowly under load. */
  iron: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <g class="fx-spin fx-slow" style="transform-origin:24px 24px">
      <circle cx="24" cy="24" r="15" stroke="url(#g${id})" stroke-width="5"/>
      <circle cx="24" cy="24" r="5.5" fill="url(#g${id})"/>
      <path d="M24 9v5M24 34v5M9 24h5M34 24h5" stroke="${b}" stroke-width="3.5" stroke-linecap="round"/>
    </g>`,
    'Iron Base'),

  /* Tempo — a pulse trace running across the icon. */
  tempo: (id, a, b) => wrap(id, grad(`g${id}`, a, b, false), `
    <path d="M4 24h8l4-11 7 22 5-14 4 3h12" stroke="${b}" stroke-width="3"
      stroke-linecap="round" stroke-linejoin="round" opacity=".22"/>
    <path d="M4 24h8l4-11 7 22 5-14 4 3h12" stroke="url(#g${id})" stroke-width="3.4"
      stroke-linecap="round" stroke-linejoin="round" class="fx-trace"
      pathLength="100" stroke-dasharray="26 74"/>`,
    'Tempo'),

  /* Bridge — an arc with something crossing it. */
  bridge: (id, a, b) => wrap(id, grad(`g${id}`, a, b, false), `
    <path d="M5 34c0-11 8.5-19 19-19s19 8 19 19" stroke="url(#g${id})" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M5 34h38" stroke="${b}" stroke-width="3.2" stroke-linecap="round" opacity=".45"/>
    <path d="M13 34V25M24 34V15.5M35 34V25" stroke="${b}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
    <circle cx="5" cy="34" r="3.4" fill="${a}" class="fx-cross"/>`,
    'Bridge'),

  /* Clean Bulk — a bar loading up, plates settling on. */
  bulk: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <path d="M6 24h36" stroke="${b}" stroke-width="3" stroke-linecap="round"/>
    <rect x="12" y="13" width="6" height="22" rx="2" fill="url(#g${id})" class="fx-stack" style="--d:0s"/>
    <rect x="21" y="9"  width="6" height="30" rx="2" fill="url(#g${id})" class="fx-stack" style="--d:.2s"/>
    <rect x="30" y="13" width="6" height="22" rx="2" fill="url(#g${id})" class="fx-stack" style="--d:.4s"/>
    <path d="M24 4v3M24 41v3" stroke="${a}" stroke-width="3" stroke-linecap="round" class="fx-pulse-soft" style="transform-origin:24px 24px"/>`,
    'Clean Bulk'),

  /* The Cut — a descending trace, trimming down. */
  cut: (id, a, b) => wrap(id, grad(`g${id}`, a, b, false), `
    <path d="M5 12h38" stroke="${b}" stroke-width="2.6" stroke-linecap="round" opacity=".28"/>
    <path d="M5 12c8 0 8 8 16 8s8 8 16 8 6 8 6 8" stroke="url(#g${id})" stroke-width="3.6"
      stroke-linecap="round" fill="none" class="fx-trace" pathLength="100" stroke-dasharray="30 70"/>
    <circle cx="43" cy="36" r="3.6" fill="${a}" class="fx-pulse-soft" style="transform-origin:43px 36px"/>`,
    'The Cut'),

  /* Hybrid — two paths crossing, lifting and running at once. */
  hybrid: (id, a, b) => wrap(id, grad(`g${id}`, a, b, false), `
    <path d="M6 34c10 0 14-20 24-20s12 8 12 8" stroke="url(#g${id})" stroke-width="3.4"
      stroke-linecap="round" fill="none" class="fx-trace" pathLength="100" stroke-dasharray="32 68"/>
    <path d="M6 14c10 0 14 20 24 20s12-8 12-8" stroke="${b}" stroke-width="3.4"
      stroke-linecap="round" fill="none" opacity=".55" class="fx-trace" style="animation-delay:-1.3s"
      pathLength="100" stroke-dasharray="32 68"/>
    <circle cx="24" cy="24" r="3.2" fill="${a}" class="fx-pulse-soft" style="transform-origin:24px 24px"/>`,
    'Hybrid'),

  /* Peak Week — a summit with a light on it. */
  peak: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <path d="M5 38 19 16l8 11 5-7 11 18Z" fill="url(#g${id})"/>
    <path d="M19 16 27 27l-5 7-6-9Z" fill="#000" opacity=".2"/>
    <circle cx="19" cy="10" r="3.4" fill="${a}" class="fx-pulse-soft" style="transform-origin:19px 10px"/>
    <path d="M12 7l-2-2M26 7l2-2M19 3V1" stroke="${a}" stroke-width="2.2" stroke-linecap="round" class="fx-drift"/>`,
    'Peak Week'),

  /* Reset — a dial coming back round to zero. */
  reset: (id, a, b) => wrap(id, grad(`g${id}`, a, b), `
    <g class="fx-rewind" style="transform-origin:24px 24px">
      <path d="M38 24a14 14 0 1 1-4.1-9.9" stroke="url(#g${id})" stroke-width="4" stroke-linecap="round"/>
      <path d="M38 8v8h-8" stroke="url(#g${id})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <circle cx="24" cy="24" r="3.4" fill="${a}" class="fx-pulse-soft" style="transform-origin:24px 24px"/>`,
    'Reset'),
};

/**
 * Render a season's animated icon.
 * @param {{id:string, icon:string, accent:string, accent2:string, name:string}} season
 */
export function seasonIcon(season) {
  const make = ICONS[season.icon] ?? ICONS.recomp;
  return make(season.id.replace(/[^a-z0-9]/gi, ''), season.accent, season.accent2);
}

export const ICON_NAMES = Object.keys(ICONS);
