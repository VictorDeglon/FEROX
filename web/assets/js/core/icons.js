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
  book:     '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  link:     '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/>',
  shield2:  '<path d="M12 3 4.5 6v6c0 4.5 3 7.8 7.5 9 4.5-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  heart:    '<path d="M12 20s-7-4.4-7-9.2A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>',
  arrowUp:  '<path d="M12 20V5m0 0-6 6m6-6 6 6"/>',
  camera:   '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.3-2h7.8l1.3 2h2.3A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><circle cx="12" cy="13" r="3.8"/>',
  bookmark: '<path d="M6 4h12v17l-6-4.5L6 21z"/>',
};

/** Brand glyphs for the footer. Filled marks, so they sit apart from the UI set. */
const SOCIAL = {
  instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.43.42.7.82.92 1.4.17.42.37 1.06.42 2.25.06 1.28.07 1.66.07 4.9s-.01 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.22.6-.5 1-.92 1.4-.42.43-.8.7-1.4.92-.42.17-1.05.37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6-.01-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.6-.22-1-.5-1.4-.92-.43-.42-.7-.8-.92-1.4-.17-.42-.37-1.05-.42-2.2C2.21 15.6 2.2 15.2 2.2 12s.01-3.6.07-4.9c.05-1.2.25-1.8.42-2.25.22-.57.5-.97.92-1.39.42-.43.8-.69 1.4-.91.42-.17 1.05-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5.01-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.43-1.3.83-.4.4-.64.8-.84 1.3-.15.4-.34 1-.39 2.1-.06 1.2-.07 1.6-.07 4.7s.01 3.5.07 4.7c.05 1.1.24 1.7.39 2.1.2.5.44.9.84 1.3.4.4.8.64 1.3.84.4.15 1 .34 2.1.39 1.2.06 1.6.07 4.7.07s3.5-.01 4.7-.07c1.1-.05 1.7-.24 2.1-.39.5-.2.9-.44 1.3-.84.4-.4.64-.8.84-1.3.15-.4.34-1 .39-2.1.06-1.2.07-1.6.07-4.7s-.01-3.5-.07-4.7c-.05-1.1-.24-1.7-.39-2.1a3.5 3.5 0 0 0-.84-1.3c-.4-.4-.8-.63-1.3-.83-.4-.16-1-.35-2.1-.4-1.2-.06-1.6-.07-4.7-.07Zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88Zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28Zm5.14-.5a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z"/>',
  x:         '<path d="M17.2 3h3.3l-7.2 8.2L21.8 21h-6.6l-5.2-6.7L3.9 21H.6l7.7-8.8L.4 3H7l4.7 6.2L17.2 3Zm-1.2 16h1.8L7.9 4.8H6L16 19Z"/>',
  tiktok:    '<path d="M16.6 2h-3.3v13.6a2.7 2.7 0 1 1-2.7-2.7c.27 0 .53.04.78.12v-3.4a6.2 6.2 0 0 0-.78-.05 6.1 6.1 0 1 0 6.1 6.1V8.9a7.4 7.4 0 0 0 4.3 1.38V6.9a4.1 4.1 0 0 1-4.4-4.9Z"/>',
  youtube:   '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1-5.2 3.1Z"/>',
  github:    '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
  discord:   '<path d="M19.3 5.4A16.8 16.8 0 0 0 15.1 4l-.2.4a15.6 15.6 0 0 1 3.7 1.2 13 13 0 0 0-11.2 0 15.6 15.6 0 0 1 3.7-1.2L11 4a16.8 16.8 0 0 0-4.2 1.4C4.1 9.4 3.4 13.3 3.7 17.1a16.9 16.9 0 0 0 5.2 2.6l1-1.7a11 11 0 0 1-1.7-.8l.4-.3a12.1 12.1 0 0 0 10.4 0l.4.3a11 11 0 0 1-1.7.8l1 1.7a16.9 16.9 0 0 0 5.2-2.6c.4-4.4-.7-8.3-2.6-11.7ZM9.3 14.8c-1 0-1.9-.9-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm5.4 0c-1 0-1.9-.9-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z"/>',
};

/** @param {keyof typeof SOCIAL} name */
export function social(name, size = 18) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${SOCIAL[name] ?? ''}</svg>`;
}

export const SOCIALS = [
  { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/' },
  { id: 'tiktok',    label: 'TikTok',    url: 'https://tiktok.com/' },
  { id: 'x',         label: 'X',         url: 'https://x.com/' },
  { id: 'youtube',   label: 'YouTube',   url: 'https://youtube.com/' },
  { id: 'discord',   label: 'Discord',   url: 'https://discord.com/' },
  { id: 'github',    label: 'GitHub',    url: 'https://github.com/VictorDeglon/FEROX' },
];

/** @param {keyof typeof P} name */
export function icon(name, cls = '') {
  const body = P[name] ?? P.bolt;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${body}</svg>`;
}

/**
 * The brand mark used in UI chrome. This is the mascot, cropped tight to the
 * face — the full head loses its detail below about 48px, the face survives
 * down to roughly 24. `size` is in CSS pixels; the source is 512 so it stays
 * sharp on any display.
 */
export function brandMark(size = 30, cls = '') {
  return `<img src="assets/brand/icon.webp" alt="" width="${size}" height="${size}"
    class="brand-mark${cls ? ' ' + cls : ''}" decoding="async"
    onerror="this.src='assets/brand/icon.png'">`;
}

/** The original geometric mark. Kept for anywhere that needs a tintable vector. */
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
