/**
 * Colour themes.
 *
 * Two independent axes, because they answer different questions:
 *
 *   mode     dark | light      — how bright the room is
 *   palette  ember | neon | …  — which colours the brand wears
 *
 * `data-theme` on <html> stays exactly what it always was (`dark` or `light`),
 * so every existing `[data-theme='light']` rule in ferox.css keeps working
 * untouched. The palette rides alongside on `data-palette` and does nothing but
 * remap the same custom properties — which is the design system's one rule, and
 * the reason three extra themes cost a block of CSS rather than a rewrite.
 *
 * Everything but `ember` has to be unlocked. See core/eggs.js.
 */
import { CONFIG } from './config.js';

export const MODES = ['dark', 'light'];

export const PALETTES = [
  {
    id: 'ember', name: 'Ember', unlock: null,
    hint: 'The FEROX default — ash and firelight.',
    swatch: ['#FF8A3D', '#FF3D2E', '#C40F2E'],
    themeColor: { dark: '#07080A', light: '#F6F7F9' },
  },
  {
    id: 'neon', name: 'Neon Wolf', unlock: 'theme-pack',
    hint: 'Hot pink and neon blue. Loud, and unapologetic about it.',
    swatch: ['#FF7AD9', '#FF2D95', '#4D5BFF'],
    themeColor: { dark: '#08040E', light: '#FFF5FB' },
  },
  {
    id: 'cosmic', name: 'Cosmic', unlock: 'theme-pack',
    hint: 'Deep space violet with starlight on the edges.',
    swatch: ['#A78BFA', '#7C5CFF', '#2E1F8F'],
    themeColor: { dark: '#05060F', light: '#F4F4FD' },
  },
  {
    id: 'nautical', name: 'Nautical', unlock: 'theme-pack',
    hint: 'Deep water, teal and brass.',
    swatch: ['#5EEAD4', '#06B6D4', '#0E7490'],
    themeColor: { dark: '#041018', light: '#F2F8FA' },
  },
];

export const DEFAULT_PALETTE = 'ember';

export const paletteById = id => PALETTES.find(p => p.id === id) ?? PALETTES[0];

/** The palettes someone can actually pick, given what they have unlocked. */
export const availablePalettes = (unlocks = []) =>
  PALETTES.filter(p => !p.unlock || unlocks.includes(p.unlock));

/* ------------------------------------------------------------------ storage */

/*
 * Mode and palette are cached in localStorage as well as being stored in the
 * athlete's document. The cache is what stops a flash of the wrong theme: it is
 * read synchronously at first paint, long before the store has loaded (which on
 * an API deployment is a network round trip away).
 */
const readLocal = key => { try { return localStorage.getItem(key); } catch { return null; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };

export const storedMode = () => (MODES.includes(readLocal(CONFIG.themeKey)) ? readLocal(CONFIG.themeKey) : 'dark');
export const storedPalette = () => {
  const id = readLocal(CONFIG.paletteKey);
  return PALETTES.some(p => p.id === id) ? id : DEFAULT_PALETTE;
};

/* ------------------------------------------------------------------- apply */

export const currentMode = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
export const currentPalette = () => document.documentElement.dataset.palette || DEFAULT_PALETTE;

/** Keep the browser chrome (address bar, task switcher) in step with the page. */
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', paletteById(currentPalette()).themeColor[currentMode()]);
}

/** Set the light/dark mode. Returns the mode now in force. */
export function applyMode(mode) {
  const next = MODES.includes(mode) ? mode : 'dark';
  document.documentElement.dataset.theme = next;
  writeLocal(CONFIG.themeKey, next);
  syncThemeColor();
  document.dispatchEvent(new CustomEvent('ferox:theme', { detail: { mode: next, palette: currentPalette() } }));
  return next;
}

/** Set the palette. Unknown ids fall back to ember rather than leaving the
 *  page half-themed — a stale id in someone's storage must not break the UI. */
export function applyPalette(id) {
  const next = PALETTES.some(p => p.id === id) ? id : DEFAULT_PALETTE;
  if (next === DEFAULT_PALETTE) delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette = next;
  writeLocal(CONFIG.paletteKey, next);
  syncThemeColor();
  document.dispatchEvent(new CustomEvent('ferox:theme', { detail: { mode: currentMode(), palette: next } }));
  return next;
}

export const toggleMode = () => applyMode(currentMode() === 'light' ? 'dark' : 'light');

/** Read the cached values onto <html>. Called once, at module load. */
export function initTheme() {
  applyMode(storedMode());
  applyPalette(storedPalette());
  return { mode: currentMode(), palette: currentPalette() };
}
