/**
 * Authentication.
 *
 * Three paths, one session shape:
 *   Firebase — a real, verified account. Firebase checks the credential with
 *              Google, hands back a uid, and that uid is what firestore.rules
 *              keys the log on. The only path trusted for data access, and the
 *              one used whenever `CONFIG.firebase` is filled in.
 *   GSI      — Google Identity Services directly, for a static deployment with
 *              no Firebase project behind it. The ID token is decoded **for
 *              display only** and proves nothing; the data stays on the device,
 *              so there is nothing for it to protect. `verified` is false and
 *              `uid` is null, which is what keeps the data layer local.
 *   Guest    — no credentials, no network, no account.
 *
 * The guest path is deliberately NOT Firebase anonymous auth. Anonymous auth
 * would mean a document in someone else's datacentre for a person who was
 * promised the opposite, and it would quietly break "nothing is sent anywhere
 * by default" — the first line of the pitch on the landing page. A guest here
 * really is a guest.
 *
 * The public surface is unchanged from the pre-Firebase version, so pages did
 * not have to learn anything new.
 */
import { CONFIG, googleReady, firebaseConfigured } from './config.js';
import { boot } from './firebase.js';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Decode a JWT payload. Display purposes only — this verifies nothing. */
function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(CONFIG.sessionKey) ?? 'null'); }
  catch { return null; }
}
function writeSession(session) {
  try {
    if (session) localStorage.setItem(CONFIG.sessionKey, JSON.stringify(session));
    else localStorage.removeItem(CONFIG.sessionKey);
  } catch { /* private mode — session lives for this tab only */ }
}

/** Firebase's user object, reduced to the five fields FEROX actually renders. */
const toUser = u => ({
  id: u.uid,
  name: u.displayName ?? u.email ?? 'Athlete',
  email: u.email ?? '',
  picture: u.photoURL ?? '',
  provider: 'google',
});

class Auth extends EventTarget {
  #session = readSession();
  #watching = null;

  get session() { return this.#session; }
  get signedIn() { return !!this.#session; }
  get user() { return this.#session?.user ?? null; }

  /**
   * The Firestore uid, or null for a guest. This is what the data layer keys
   * on — `store.init({ uid })` picks the cloud adapter if and only if it is
   * set, which makes "signed in" and "synced" the same condition by
   * construction rather than by two code paths agreeing.
   */
  get uid() { return this.#session?.verified ? this.#session.user.id : null; }

  /** Kept for callers that still want a bearer token (nothing in-tree does). */
  async idToken() {
    if (!this.uid) return null;
    const { auth } = await boot();
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  }

  /* ------------------------------------------------------ Google Identity */

  #gsiLoaded = null;

  /** Load the Google Identity Services script once. */
  #loadGsi() {
    this.#gsiLoaded ??= new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve(window.google);
      const el = document.createElement('script');
      el.src = GSI_SRC; el.async = true; el.defer = true;
      el.onload = () => resolve(window.google);
      el.onerror = () => reject(new Error('gsi-load-failed'));
      document.head.append(el);
    });
    return this.#gsiLoaded;
  }

  /** Render Google's own button. Sign-in arrives via the change event. */
  async #mountGsiButton(el, { theme = 'filled_black', size = 'large', text = 'continue_with' } = {}) {
    const google = await this.#loadGsi();
    google.accounts.id.initialize({
      client_id: CONFIG.googleClientId,
      callback: res => this.#handleGsiCredential(res.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });
    google.accounts.id.renderButton(el, {
      theme, size, text, shape: 'pill', logo_alignment: 'left', width: el.offsetWidth || 280,
    });
  }

  /**
   * A Google credential with no Firebase behind it.
   *
   * `verified: false` is the load-bearing part. It makes `uid` null, which
   * makes `store.init` choose local storage — so the claims in this token can
   * never be mistaken for permission to read anything.
   */
  #handleGsiCredential(credential) {
    const c = decodeJwt(credential);
    if (!c) return;
    this.#set({
      verified: false,
      user: {
        id: c.sub,
        name: c.name ?? c.email ?? 'Athlete',
        email: c.email ?? '',
        picture: c.picture ?? '',
        provider: 'google',
      },
    });
  }

  #set(session) {
    this.#session = session;
    writeSession(session);
    this.dispatchEvent(new CustomEvent('change', { detail: session }));
  }

  onChange(fn) {
    this.addEventListener('change', e => fn(e.detail));
    return () => this.removeEventListener('change', fn);
  }

  /**
   * Re-attach to a Firebase session that outlived the page.
   *
   * The cached session in localStorage is what paints the header on the first
   * frame; this confirms it against Firebase a moment later and corrects it if
   * the account was signed out elsewhere. Resolves once Firebase has had its
   * say, so callers can await a trustworthy answer before loading data.
   */
  restore() {
    // Nothing to re-attach to on the GSI path: that session is whatever is in
    // localStorage, and Google is not asked to confirm it because it was never
    // treated as proof of anything in the first place.
    if (!firebaseConfigured()) return Promise.resolve(this.#session);
    this.#watching ??= boot().then(({ auth, fb }) => new Promise(resolve => {
      let settled = false;
      fb.onAuthStateChanged(auth, user => {
        if (user) this.#set({ user: toUser(user), verified: true });
        // Only clear a session that claimed to be a real account. A guest is
        // invisible to Firebase and must not be signed out by its silence.
        else if (this.#session?.verified) this.#set(null);
        if (!settled) { settled = true; resolve(this.#session); }
      });
    })).catch(() => this.#session);
    return this.#watching;
  }

  /**
   * Render the sign-in button into `el`.
   *
   * Firebase has no drop-in button of its own, so this is ours — which is
   * actually an improvement: it inherits the app's palette instead of fighting
   * it, and it matches `.btn-google`, already styled for the disabled state
   * the unconfigured deployment shows.
   */
  async mountGoogleButton(el, { text = 'Continue with Google' } = {}) {
    if (!googleReady()) throw new Error('google-not-configured');

    // Google's own button on the GSI path — it carries its own sign-in flow,
    // and swapping in ours would mean reimplementing One Tap for no gain.
    if (!firebaseConfigured()) return this.#mountGsiButton(el);

    await boot();                      // fail here, not on the first click

    el.innerHTML = `<button class="btn btn-google btn-lg btn-block" type="button">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/></svg>
      <span>${text}</span></button>`;

    el.querySelector('button').addEventListener('click', () => this.signInWithGoogle());
  }

  /**
   * Popup first, redirect as the fallback.
   *
   * Popups are blocked often enough — iOS standalone PWAs block them outright,
   * and FEROX ships a manifest — that treating a blocked popup as a failure
   * would strand exactly the people most likely to have installed the app.
   */
  async signInWithGoogle() {
    if (!firebaseConfigured()) throw new Error('gsi-uses-its-own-button');
    const { auth, fb } = await boot();
    const provider = new fb.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const { user } = await fb.signInWithPopup(auth, provider);
      this.#set({ user: toUser(user), verified: true });
      return this.#session;
    } catch (err) {
      const blocked = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment',
        'auth/cancelled-popup-request'].includes(err?.code);
      if (blocked) return fb.signInWithRedirect(auth, provider);   // never resolves; the page leaves
      if (err?.code === 'auth/popup-closed-by-user') return null;  // they changed their mind
      throw err;
    }
  }

  /** No-credential path: data stays on this device. */
  signInAsGuest(name = 'Guest') {
    this.#set({ verified: false, user: { id: 'guest', name, email: '', picture: '', provider: 'guest' } });
  }

  async signOut() {
    if (this.#session?.verified && firebaseConfigured()) {
      try { const { auth, fb } = await boot(); await fb.signOut(auth); } catch { /* offline — local sign-out still stands */ }
    }
    this.#set(null);
  }
}

export const auth = new Auth();
