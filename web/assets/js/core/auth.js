/**
 * Authentication.
 *
 * Two paths, one session shape:
 *   Google  — Google Identity Services issues an ID token (a JWT). In static
 *             mode we read the public claims for display only. When an API is
 *             configured the raw token is POSTed to /api/auth/google, which
 *             verifies it against Google's keys and returns a FEROX session
 *             token — that is the only path that is trusted for data access.
 *   Guest   — no credentials, data stays on the device.
 *
 * The ID token's claims are NEVER treated as proof of anything in static mode;
 * they only fill in a name and avatar. All local data is device-local anyway.
 */
import { CONFIG, googleReady } from './config.js';

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

class Auth extends EventTarget {
  #session = readSession();
  #gsiLoaded = null;

  get session() { return this.#session; }
  get signedIn() { return !!this.#session; }
  get user() { return this.#session?.user ?? null; }
  get token() { return this.#session?.token ?? null; }

  #set(session) {
    this.#session = session;
    writeSession(session);
    this.dispatchEvent(new CustomEvent('change', { detail: session }));
  }

  onChange(fn) {
    this.addEventListener('change', e => fn(e.detail));
    return () => this.removeEventListener('change', fn);
  }

  /** Load the Google Identity Services script once. */
  loadGsi() {
    if (!googleReady()) return Promise.reject(new Error('no-client-id'));
    this.#gsiLoaded ??= new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve(window.google);
      const s = document.createElement('script');
      s.src = GSI_SRC; s.async = true; s.defer = true;
      s.onload = () => resolve(window.google);
      s.onerror = () => reject(new Error('gsi-load-failed'));
      document.head.append(s);
    });
    return this.#gsiLoaded;
  }

  /**
   * Render Google's official button into `el`.
   * Resolves once the button is mounted; sign-in arrives via the change event.
   */
  async mountGoogleButton(el, { theme = 'filled_black', size = 'large', text = 'continue_with' } = {}) {
    const google = await this.loadGsi();
    google.accounts.id.initialize({
      client_id: CONFIG.googleClientId,
      callback: res => this.#handleCredential(res.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });
    google.accounts.id.renderButton(el, {
      theme, size, text, shape: 'pill', logo_alignment: 'left', width: el.offsetWidth || 280,
    });
  }

  async #handleCredential(credential) {
    const claims = decodeJwt(credential);
    if (!claims) return;

    const user = {
      id: claims.sub,
      name: claims.name ?? claims.email ?? 'Athlete',
      email: claims.email ?? '',
      picture: claims.picture ?? '',
      provider: 'google',
    };

    // With an API configured, exchange the Google token for a verified session.
    if (CONFIG.apiBase) {
      try {
        const res = await fetch(`${CONFIG.apiBase.replace(/\/$/, '')}/api/auth/google`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ credential }),
        });
        if (res.ok) {
          const { token, user: verified } = await res.json();
          this.#set({ token, user: verified ?? user, verified: true });
          return;
        }
        console.warn('[ferox] server rejected the Google token; continuing unverified.');
      } catch {
        console.warn('[ferox] auth endpoint unreachable; continuing unverified.');
      }
    }

    this.#set({ token: null, user, verified: false });
  }

  /** No-credential path: data stays on this device. */
  signInAsGuest(name = 'Guest') {
    this.#set({ token: null, verified: false, user: { id: 'guest', name, email: '', picture: '', provider: 'guest' } });
  }

  async signOut() {
    if (googleReady() && window.google?.accounts?.id) {
      try { window.google.accounts.id.disableAutoSelect(); } catch { /* ignore */ }
    }
    this.#set(null);
  }
}

export const auth = new Auth();
export { decodeJwt };
