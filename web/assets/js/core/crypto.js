/**
 * End-to-end encryption for direct messages.
 *
 * ## What this actually gives you
 *
 * Every athlete generates an ECDH P-256 key pair the first time they open
 * messages. The public half goes on their public profile; the private half is
 * stored **non-extractable** in IndexedDB, which means the browser will use it
 * for key agreement but will not hand the bytes to any JavaScript, including
 * this file. Two people derive the same shared secret from their own private
 * key and the other's public key, run it through HKDF, and encrypt with
 * AES-GCM.
 *
 * The consequence worth stating plainly: **Firestore stores ciphertext and
 * nothing else.** The database owner, anybody with a stolen admin key, and
 * anybody who later subpoenas the project can read the timestamps and who
 * talked to whom, and cannot read a word of what was said.
 *
 * ## What it does not give you, said honestly
 *
 * - **The server ships the code.** Whoever controls the hosting could serve a
 *   build that leaks keys, and no amount of client-side crypto fixes that.
 *   This is true of every end-to-end encrypted web app, Signal's included,
 *   and it is the reason their desktop client is an installed binary. It is a
 *   real limitation, not a technicality.
 * - **No forward secrecy.** The key agreement is static: one long-lived pair
 *   per person. If a device is compromised, past messages on that device are
 *   readable. Ratcheting protocols solve this and are a great deal more
 *   machinery than this app can carry honestly.
 * - **Keys do not follow you between devices.** The private key never leaves
 *   the browser that made it, so signing in somewhere new means a new key and
 *   no access to older conversations. Syncing it would mean putting it
 *   somewhere the server can see, which would undo the whole exercise.
 * - **Metadata is not hidden.** Who, when and how often are all in plain
 *   sight, because the rules need them to decide who may read what.
 *
 * Say all of that to anyone who asks whether FEROX messages are private. The
 * answer is "the contents are, from us and from Google; the fact you spoke is
 * not; and don't plan a crime here".
 */

const DB = 'ferox-keys';
const STORE = 'keys';
const KEY_ID = 'dm-ecdh-v1';

/** Is the Web Crypto we need actually here? Not on http:// it is not. */
export const cryptoReady = () =>
  Boolean(globalThis.crypto?.subtle && globalThis.indexedDB && globalThis.isSecureContext);

/* ----------------------------------------------------------- key storage */

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const idbGet = async key => {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result ?? null);
    r.onerror = () => reject(r.error);
  });
};

const idbPut = async (key, value) => {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

/* -------------------------------------------------------------- key pair */

let cached = null;

/**
 * This device's key pair, created on first use.
 *
 * `extractable: false` on the private key is the whole point. A `CryptoKey`
 * can be stored in IndexedDB directly — it does not have to be serialised —
 * so the private half is usable and unreadable at the same time. An XSS on
 * this origin could still *use* the key while the page is open; it could not
 * steal it and walk away.
 */
export async function keyPair() {
  if (cached) return cached;
  if (!cryptoReady()) throw new Error('crypto-unavailable');

  const stored = await idbGet(KEY_ID).catch(() => null);
  if (stored?.privateKey && stored?.publicKey) {
    cached = stored;
    return cached;
  }

  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,                       // private key never leaves the browser
    ['deriveKey', 'deriveBits'],
  );
  await idbPut(KEY_ID, pair);
  cached = pair;
  return cached;
}

/** This device's public key, as a JWK string to put on the public profile. */
export async function publicKeyJwk() {
  const { publicKey } = await keyPair();
  return JSON.stringify(await crypto.subtle.exportKey('jwk', publicKey));
}

const importPublic = jwk => crypto.subtle.importKey(
  'jwk', typeof jwk === 'string' ? JSON.parse(jwk) : jwk,
  { name: 'ECDH', namedCurve: 'P-256' }, true, []);

/* ------------------------------------------------------- shared secrets */

const sharedCache = new Map();

/**
 * The AES key for a conversation.
 *
 * ECDH gives both sides the same bits; HKDF turns those bits into a key with
 * the conversation's own id as salt, so two people who talk in more than one
 * context never reuse a key, and a raw ECDH output is never used as a key
 * directly — which is the standard mistake.
 */
export async function conversationKey(theirJwk, pairId) {
  const memo = `${pairId}:${typeof theirJwk === 'string' ? theirJwk.slice(0, 32) : ''}`;
  if (sharedCache.has(memo)) return sharedCache.get(memo);

  const { privateKey } = await keyPair();
  const theirs = await importPublic(theirJwk);

  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirs }, privateKey, 256);

  const base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(`ferox:dm:${pairId}`),
      info: new TextEncoder().encode('ferox-dm-v1'),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  sharedCache.set(memo, key);
  return key;
}

/* ---------------------------------------------------------- the payload */

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

/** Longest message we will encrypt. A chat line, not a file transfer. */
export const MAX_MESSAGE = 2000;

/** @returns {{ct:string, iv:string, v:number}} — everything base64. */
export async function encrypt(key, text) {
  const body = String(text ?? '').slice(0, MAX_MESSAGE);
  // A fresh 96-bit IV per message. Reusing one under AES-GCM is catastrophic
  // rather than merely weak, so it is generated here and never derived.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(body));
  return { ct: b64(ct), iv: b64(iv), v: 1 };
}

/**
 * Decrypt, or return null.
 *
 * Null rather than a throw because a conversation will legitimately contain
 * messages this device cannot read — anything sent before this browser
 * generated its key, or sent to a key the other side has since replaced. One
 * unreadable line should render as one unreadable line, not take the thread
 * down with it.
 */
export async function decrypt(key, { ct, iv }) {
  try {
    const out = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct));
    return new TextDecoder().decode(out);
  } catch { return null; }
}

/** Wipe this device's key. Used when erasing an account. */
export async function forgetKeys() {
  cached = null;
  sharedCache.clear();
  try {
    const db = await idb();
    await new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY_ID);
      tx.oncomplete = res; tx.onerror = res;
    });
    return true;
  } catch { return false; }
}
