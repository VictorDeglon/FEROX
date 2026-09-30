/**
 * FEROX runtime configuration.
 *
 * The app is static-first: it runs entirely in the browser with no backend.
 * If `apiBase` points at a running FEROX server, the data layer transparently
 * switches to it (see store.js -> RemoteAdapter).
 *
 * `googleClientId` is a PLACEHOLDER. Create your own OAuth client and paste the
 * id here — see docs/google-oauth-setup.md. Until then, Google Sign-In renders
 * a disabled button and the "Continue as guest" path is used instead.
 */
export const CONFIG = {
  appName: 'FEROX',
  tagline: 'Train. Track. Progress.',

  // Replace with your own — ends in `.apps.googleusercontent.com`.
  googleClientId: 'REPLACE_ME.apps.googleusercontent.com',

  // '' = pure static/local mode. Set to e.g. 'http://localhost:4000' to use the API.
  apiBase: '',

  storageKey: 'ferox.v2',
  sessionKey: 'ferox.v2.session',
  themeKey: 'ferox.v2.theme',
  /** Cached so the palette is on <html> before the first paint, not after. */
  paletteKey: 'ferox.v2.palette',
};

/** True once a real Google client id has been configured. */
export const googleReady = () => !CONFIG.googleClientId.startsWith('REPLACE_ME');

/** Allow local experiments without editing this file: ?api=... / ?gid=... */
const qs = new URLSearchParams(location.search);
if (qs.get('api') !== null) CONFIG.apiBase = qs.get('api');
if (qs.get('gid')) CONFIG.googleClientId = qs.get('gid');
