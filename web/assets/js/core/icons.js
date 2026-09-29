/**
 * Inline icon set. 24x24 grid, stroke-based, inherits `currentColor`.
 * Kept in-repo so the app has zero icon-font dependencies and works offline.
 */
const P = {
  home:     '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  dumbbell: '<rect x="2.5" y="9.2" width="3" height="5.6" rx="1"/><rect x="6.3" y="6.4" width="3.6" height="11.2" rx="1.3"/><rect x="14.1" y="6.4" width="3.6" height="11.2" rx="1.3"/><rect x="18.5" y="9.2" width="3" height="5.6" rx="1"/><path d="M9.9 12h4.2"/>',
  apple:    '<path d="M12 8.1c1.3-1.3 3.3-1.8 4.9-.8 2 1.2 2.5 4.1 1.4 7.1-.9 2.7-2.7 5.1-4.3 5.1-.9 0-1.3-.5-2-.5s-1.1.5-2 .5c-1.6 0-3.4-2.4-4.3-5.1-1.1-3-.6-5.9 1.4-7.1 1.6-1 3.6-.5 4.9.8Z"/><path d="M12 8.1V5.6c0-1.2 1-2.1 2.2-2.1"/>',
  chart:    '<path d="M3 3v18h18"/><path d="m7 15 3.5-4.5 3 2.5L20 6"/>',
  trophy:   '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3"/><path d="M12 14v4m-3.5 3h7l-.7-3h-5.6z"/>',
  users:    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16.5 5.6a3.2 3.2 0 0 1 0 6.1M17 14.4a6 6 0 0 1 4 5.6"/>',
  flame:    '<path d="M12 22c3.9 0 6.5-2.5 6.5-6 0-4.5-4-6-4.5-10-2.5 1.5-3 4-3 5.5C11 9 9.5 8 9 6.5 6.9 8.4 5.5 10.9 5.5 14c0 3.5 2.6 8 6.5 8Z"/>',
  user:     '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  bolt:     '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  check:    '<path d="m4.5 12.5 5 5 10-11"/>',
  x:        '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron:  '<path d="m9 5 7 7-7 7"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  target:   '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4m8-4v4"/>',
  scale:    '<path d="M12 4v16M6 8h12"/><path d="M6 8 3 15a3 3 0 0 0 6 0zM18 8l-3 7a3 3 0 0 0 6 0z"/>',
  moon:     '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  sun:      '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  logout:   '<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M11 8 7 12l4 4M7 12h9"/>',
  search:   '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  trash:    '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.5a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7 2 2 0 1 1 0 4Z"/>',
  medal:    '<circle cx="12" cy="15" r="5.2"/><circle cx="12" cy="15" r="1.7"/><path d="M6.6 3.5 9.6 10.3M17.4 3.5 14.4 10.3"/>',
  download: '<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  shield:   '<path d="M12 3 4.5 6v6c0 4.5 3 7.8 7.5 9 4.5-1.2 7.5-4.5 7.5-9V6z"/>',
  sparkle:  '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3l-1.8-5.7L4.5 10.8 10.2 9z"/>',
  menu:     '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrowUp:  '<path d="M12 20V5m0 0-6 6m6-6 6 6"/>',
};

/** @param {keyof typeof P} name */
export function icon(name, cls = '') {
  const body = P[name] ?? P.bolt;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${body}</svg>`;
}

export const WOLF_MARK = `<svg viewBox="0 0 128 128" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M48 12 L64 40 L74 10 L87 38 L99 44 L114 50 L123 57 L117 65 L105 64 L110 76 L98 72 L104 86 L88 80 L80 94 L64 97 L69 114 L50 106 L44 121 L30 102 L20 109 L16 86 L26 68 L22 56 L33 44 L38 26 Z M82 44 L96 49 L94 56 L82 51 Z M111.4 57.3 A2.6 2.6 0 1 1 116.6 57.3 A2.6 2.6 0 1 1 111.4 57.3 Z M52 21 L64 40 L56 40 Z M74 12 L86 37 L77 36 Z"/></svg>`;

/** Google's four-colour G, for the official sign-in button styling. */
export function googleGlyph(size = 17) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/>
    <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z"/>
    <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z"/>
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"/>
  </svg>`;
}
