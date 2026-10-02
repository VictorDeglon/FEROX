/**
 * Firebase bootstrap.
 *
 * The SDK is fetched from Google's CDN as ES modules and imported dynamically,
 * so FEROX keeps its one hard rule: no build step, no bundler, `web/` deploys
 * exactly as it sits on disk.
 *
 * Nothing here runs on page load. `boot()` is called the first time something
 * actually needs an account or a cloud log, which means a guest — still the
 * default path — never downloads a byte of it. That matters: the SDK is larger
 * than the rest of the app put together.
 *
 * Everything is funnelled through one promise, so twenty callers on one page
 * initialise the app once.
 */
import { CONFIG, firebaseConfigured } from './config.js';

/** Pinned deliberately. A floating version is a third party shipping to prod. */
export const SDK_VERSION = '12.19.0';
const sdk = part => `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-${part}.js`;

let booting = null;

/**
 * Load the SDK, initialise the app, and hand back the pieces FEROX uses.
 *
 * @returns {Promise<{auth:object, db:object, fb:object, fs:object}>}
 *   `fb` and `fs` are the raw auth and firestore module namespaces — callers
 *   need their functions (signInWithPopup, doc, setDoc…) and re-exporting each
 *   one by hand would be a maintenance tax for no benefit.
 */
export function boot() {
  if (!firebaseConfigured()) return Promise.reject(new Error('firebase-not-configured'));

  booting ??= (async () => {
    const [app, fb, fs] = await Promise.all([
      import(sdk('app')), import(sdk('auth')), import(sdk('firestore')),
    ]);

    const instance = app.initializeApp(CONFIG.firebase);
    const auth = fb.getAuth(instance);

    // Survive a reload and a closed tab. Falls back to in-memory on its own if
    // storage is unavailable (private mode), which is the right failure here.
    await fb.setPersistence(auth, fb.browserLocalPersistence).catch(() => {});

    // Offline-first, to match what the app already promised. The IndexedDB
    // cache answers reads with no network and queues writes until there is
    // one, so a gym basement behaves exactly like it did on localStorage.
    let db;
    try {
      db = fs.initializeFirestore(instance, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch {
      // Already initialised elsewhere, or IndexedDB is blocked. Memory cache
      // still syncs; it just forgets between loads.
      db = fs.getFirestore(instance);
    }

    return { auth, db, fb, fs };
  })();

  return booting;
}
