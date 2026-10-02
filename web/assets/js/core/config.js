/**
 * FEROX runtime configuration.
 *
 * The app is static-first: it runs entirely in the browser, and a guest never
 * talks to a server at all. Signing in with Google switches the data layer
 * over to Firestore so the log follows the account between devices — see
 * store.js -> FirestoreAdapter.
 *
 * The `firebase` block below is not secret. A web API key identifies the
 * project; it does not authorise anything. What keeps one athlete out of
 * another's log is firestore.rules, which is the only thing standing between
 * them — read it before you change it.
 */
export const CONFIG = {
  appName: 'FEROX',
  tagline: 'Train. Track. Progress.',

  /**
   * Google sign-in, the direct way: Google Identity Services in the browser.
   *
   * This is the path that works on any static host, including GitHub Pages,
   * with nothing behind it. The ID token Google returns is decoded **for
   * display only** — a name and a picture — and proves nothing, which is fine
   * because in this mode the data never leaves the device anyway.
   *
   * A client id is not a secret. It is visible to anyone who loads the page by
   * design, and committing it is correct. The client *secret* is a different
   * thing and FEROX never uses one.
   *
   * The origin you serve from must be listed under **Authorised JavaScript
   * origins** on this client in the Google Cloud console, or Google refuses to
   * render the button.
   */
  googleClientId: '807907944000-mbj5n77ath2sijfaidp29dggb0kommbv.apps.googleusercontent.com',

  /**
   * Firebase project config, from `firebase apps:sdkconfig web`.
   *
   * When this is filled in it **takes precedence** over `googleClientId`:
   * sign-in becomes a real verified account and the log syncs to Firestore.
   * While it is a placeholder, FEROX uses the Google path above and keeps
   * everything on the device. Both are honest states; only one is a lie, and
   * that is claiming sync when there is none.
   */
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: 'feroxfitness.firebaseapp.com',
    projectId: 'feroxfitness',
    storageBucket: 'feroxfitness.firebasestorage.app',
    messagingSenderId: '807907944000',
    appId: 'REPLACE_ME',
  },

  /**
   * Optional endpoint that estimates a meal from a photograph.
   *
   * Empty by default, and the photo path stays hidden until it is set. Food
   * recognition needs a vision model far larger than this whole app, so it
   * cannot run offline — see core/vision.js for the full reasoning. When this
   * is configured the athlete is told the photo leaves the device, told where
   * it goes, and asked before it is sent.
   */
  visionEndpoint: '',

  storageKey: 'ferox.v2',
  sessionKey: 'ferox.v2.session',
  themeKey: 'ferox.v2.theme',
  /** Cached so the palette is on <html> before the first paint, not after. */
  paletteKey: 'ferox.v2.palette',
};

/** True when the Firebase path is configured — verified accounts, cloud sync. */
export const firebaseConfigured = () => !CONFIG.firebase.apiKey.startsWith('REPLACE_ME');

/** True when the direct Google Identity Services path is configured. */
export const gsiConfigured = () =>
  Boolean(CONFIG.googleClientId) && !CONFIG.googleClientId.startsWith('REPLACE_ME');

/**
 * True when "Sign in with Google" can work at all, by either route.
 *
 * Named for what the UI asks about rather than what answers it: the pages care
 * whether to render a live button or an honest disabled one, and should not
 * have to know which of the two paths is behind it.
 */
export const googleReady = () => firebaseConfigured() || gsiConfigured();

/** Force the local-only path without editing this file: ?local */
const qs = new URLSearchParams(location.search);
if (qs.get('local') !== null) {
  CONFIG.firebase = { ...CONFIG.firebase, apiKey: 'REPLACE_ME' };
  CONFIG.googleClientId = '';
}
