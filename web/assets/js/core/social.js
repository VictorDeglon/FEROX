/**
 * Handles, public profiles and finding people.
 *
 * Everything an athlete logs stays in the one private document at
 * `users/{uid}` that nobody else can read. This file is the deliberately thin
 * public surface on top of it — the few facts someone has agreed to show.
 *
 * ## The shape, and why it costs almost nothing to run
 *
 *   handles/{handle}   { uid, nickname, picture }
 *   profiles/{uid}     { handle, nickname, picture, joined, + public stats }
 *
 * Four decisions do the cost work, because Firestore bills per document read
 * and per write, and a social feature is where an app of this kind normally
 * starts costing money:
 *
 * 1. **The handle is the document id.** Firestore has no unique constraint,
 *    and the usual workaround is a query — which costs a read per result and
 *    cannot be made atomic. Making the handle the id turns "is this taken?"
 *    into a single `getDoc`, the cheapest operation there is, and turns
 *    "claim it" into a transaction that physically cannot double-allocate.
 *
 * 2. **Search is a key range, not a query over profiles.** Prefix matching
 *    walks `handles` by document id, which every Firestore project indexes for
 *    free — no composite index to define, none to pay for. The documents it
 *    walks are three short strings, and it carries the nickname and picture so
 *    a result list needs no second fetch. A full profile is read only when
 *    someone actually opens one.
 *
 * 3. **Public stats are published on a cadence, not on every change.** The
 *    naive version writes a public document every time a set is logged, which
 *    is thousands of writes a month per active athlete for a streak number
 *    nobody is watching that closely. `publishProfile` writes only when a
 *    value has actually moved and at most once an hour — see PUBLISH_EVERY_MS.
 *
 * 4. **Avatars are URLs, not files.** Google already hosts the picture it gave
 *    us. Copying it into Cloud Storage would mean paying to store and serve a
 *    file that is already stored and served for free.
 *
 * At a thousand active athletes this is a few thousand reads and a few hundred
 * writes a day, which is inside the free tier with room to spare.
 */
import { boot } from './firebase.js';
import { firebaseConfigured } from './config.js';

/* ------------------------------------------------------------- handles */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/**
 * Names nobody gets to hold, because a handle doubles as a URL segment and
 * `/u/admin` should not be somebody's account. Short, and worth keeping short
 * — an over-long list mostly annoys people with ordinary names.
 */
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'about',
  'ferox', 'official', 'staff', 'team', 'mod', 'moderator', 'api', 'www',
  'login', 'signin', 'signup', 'settings', 'profile', 'profiles', 'user',
  'users', 'handle', 'handles', 'me', 'you', 'new', 'edit', 'delete', 'null',
  'undefined', 'anonymous', 'guest',
]);

/**
 * Normalise anything into handle shape: lowercase, a-z 0-9 and underscore.
 *
 * Lowercase is not cosmetic. The handle is a document id, document ids are
 * case-sensitive, and without folding `Victor` and `victor` are two different
 * accounts that look identical in a list — which is the whole mechanism behind
 * impersonating somebody.
 */
export const normaliseHandle = s => String(s ?? '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip accents
  .replace(/[^a-z0-9_]+/g, '')
  .slice(0, HANDLE_MAX);

/** @returns {{ok:true}|{ok:false, why:string}} */
export function validateHandle(raw) {
  const h = normaliseHandle(raw);
  if (!h) return { ok: false, why: 'Letters and numbers only.' };
  if (h.length < HANDLE_MIN) return { ok: false, why: `At least ${HANDLE_MIN} characters.` };
  if (h.length > HANDLE_MAX) return { ok: false, why: `At most ${HANDLE_MAX} characters.` };
  if (/^[0-9_]+$/.test(h)) return { ok: false, why: 'Needs at least one letter.' };
  if (RESERVED.has(h)) return { ok: false, why: 'That one is reserved.' };
  return { ok: true, handle: h };
}

/**
 * Candidate handles from an email and a display name.
 *
 * Offered at sign-in so almost nobody has to think about it. The numbered
 * fallbacks are deliberately short — `victor7` reads like a person's handle in
 * a way that `victor8842` does not.
 */
export function suggestHandles(email = '', name = '', taken = new Set()) {
  const local = normaliseHandle(String(email).split('@')[0]);
  const parts = String(name).trim().split(/\s+/).filter(Boolean).map(normaliseHandle);
  const [first = '', last = ''] = parts;

  const seeds = [
    local, first, first + last, first + (last[0] ?? ''),
    (first[0] ?? '') + last, first + '_' + last,
  ];

  const out = [];
  const push = h => {
    const v = validateHandle(h);
    if (v.ok && !taken.has(v.handle) && !out.includes(v.handle)) out.push(v.handle);
  };
  for (const s of seeds) push(s);
  // Only pad once the plain forms are gone, and from the best seed available.
  const base = [local, first, first + last].find(s => normaliseHandle(s).length >= HANDLE_MIN) ?? 'athlete';
  for (let n = 2; out.length < 5 && n < 40; n++) push(`${base}${n}`);
  return out.slice(0, 5);
}

/** Is this handle free? One document read — the cheapest call Firestore has. */
export async function handleAvailable(handle) {
  const v = validateHandle(handle);
  if (!v.ok) return { available: false, why: v.why };
  if (!firebaseConfigured()) return { available: true, handle: v.handle, offline: true };
  const { db, fs } = await boot();
  const snap = await fs.getDoc(fs.doc(db, 'handles', v.handle));
  return snap.exists()
    ? { available: false, handle: v.handle, why: 'Already taken.' }
    : { available: true, handle: v.handle };
}

/**
 * Claim a handle, atomically, releasing the previous one.
 *
 * In a transaction because availability and the claim must be one step: two
 * people typing the same handle at the same moment is exactly the case a
 * check-then-write loses, and the loser silently overwrites the winner.
 *
 * @throws {Error} with `code` 'taken' | 'invalid' so callers can say something useful
 */
export async function claimHandle(uid, raw, { nickname = '', picture = '', previous = '' } = {}) {
  const v = validateHandle(raw);
  if (!v.ok) { const e = new Error(v.why); e.code = 'invalid'; throw e; }
  const handle = v.handle;
  if (handle === previous) return handle;

  const { db, fs } = await boot();
  await fs.runTransaction(db, async tx => {
    const ref = fs.doc(db, 'handles', handle);
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().uid !== uid) {
      const e = new Error('Already taken.'); e.code = 'taken'; throw e;
    }
    tx.set(ref, { uid, nickname, picture });
    if (previous && previous !== handle) tx.delete(fs.doc(db, 'handles', previous));
    tx.set(fs.doc(db, 'profiles', uid), { handle, nickname, picture }, { merge: true });
  });
  return handle;
}

/* ------------------------------------------------------- public profile */

/**
 * The only things that ever leave the private document.
 *
 * An allow-list, not a deny-list, and the difference is the whole point: a
 * field added to the log later is private by default and has to be named here
 * to become public. The other way round, every new field is a leak waiting
 * for someone to notice.
 *
 * Bodyweight, body fat, measurements, what anyone ate and every note are
 * absent on purpose and should stay absent.
 */
export const PUBLIC_FIELDS = ['handle', 'nickname', 'picture', 'joined',
  'streak', 'sessions', 'volume', 'medals'];

/**
 * A number fit to publish.
 *
 * `Math.max(0, NaN)` is `NaN`, so clamping alone lets a broken stat through —
 * and Firestore stores NaN quite happily, which means it then comes back and
 * renders as "NaN sessions" on a public page.
 */
const stat = v => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

/** Build the public view of an athlete from their private document. */
export function publicProfileFrom(data, stats, uid) {
  const p = data?.profile ?? {};
  return {
    uid,
    handle: p.handle ?? '',
    nickname: (p.name ?? '').trim().slice(0, 40),
    picture: p.picture ?? '',
    joined: p.joined ?? '',
    streak: stat(stats?.streak),
    sessions: stat(stats?.sessions),
    volume: stat(stats?.volume),
    medals: stat((data?.medals ?? []).length),
  };
}

/** Don't rewrite a public document more than this often. See the header. */
export const PUBLISH_EVERY_MS = 60 * 60 * 1000;

/** True when the public copy is stale enough to be worth a write. */
export function shouldPublish(next, last, now = Date.now()) {
  if (!next?.handle) return false;              // nothing to publish under
  if (!last) return true;
  const changed = PUBLIC_FIELDS.some(k => next[k] !== last[k]);
  if (!changed) return false;
  // A changed identity is worth a write immediately; a changed number can
  // wait, because nobody is watching someone else's streak to the minute.
  const identity = ['handle', 'nickname', 'picture'].some(k => next[k] !== last[k]);
  return identity || now - (last.at ?? 0) >= PUBLISH_EVERY_MS;
}

/**
 * Publish, if it is worth it. Returns the record to remember as "last sent",
 * or null when nothing was written.
 */
export async function publishProfile(uid, next, last, now = Date.now()) {
  if (!firebaseConfigured() || !uid) return null;
  if (!shouldPublish(next, last, now)) return null;

  const { db, fs } = await boot();
  await fs.setDoc(fs.doc(db, 'profiles', uid),
    { ...next, updatedAt: fs.serverTimestamp() }, { merge: true });

  // The search index carries the three fields a result row shows, so finding
  // somebody never has to read their profile as well.
  if (next.handle) {
    await fs.setDoc(fs.doc(db, 'handles', next.handle),
      { uid, nickname: next.nickname, picture: next.picture }, { merge: true });
  }
  return { ...next, at: now };
}

/* ---------------------------------------------------------------- search */

/**
 * Find people by the start of their handle.
 *
 * A key range over document ids, which is indexed for free and reads only the
 * rows it returns. Firestore cannot do substring or fuzzy matching without a
 * separate search product that costs real money per month, and for finding a
 * person you already know the name of, prefix matching is what people expect
 * anyway.
 */
export async function searchPeople(prefix, { limit = 10, exclude = null } = {}) {
  const q = normaliseHandle(prefix);
  if (q.length < 2 || !firebaseConfigured()) return [];

  const { db, fs } = await boot();
  // '' is above any character a handle may contain, so [q, q+]
  // is exactly the set of ids beginning with q.
  const rows = await fs.getDocs(fs.query(
    fs.collection(db, 'handles'),
    fs.orderBy(fs.documentId()),
    fs.startAt(q), fs.endAt(q + ''),
    fs.limit(limit + 1),
  ));

  return rows.docs
    .map(d => ({ handle: d.id, ...d.data() }))
    .filter(r => r.uid && r.uid !== exclude)
    .slice(0, limit);
}

/** One public profile, by handle. Two reads: the handle, then the profile. */
export async function profileByHandle(handle) {
  const v = validateHandle(handle);
  if (!v.ok || !firebaseConfigured()) return null;
  const { db, fs } = await boot();
  const h = await fs.getDoc(fs.doc(db, 'handles', v.handle));
  if (!h.exists()) return null;
  const p = await fs.getDoc(fs.doc(db, 'profiles', h.data().uid));
  return p.exists() ? { uid: h.data().uid, ...p.data() } : null;
}

/** Several public profiles at once, for a leaderboard of saved friends. */
export async function profilesByUid(uids = []) {
  if (!uids.length || !firebaseConfigured()) return [];
  const { db, fs } = await boot();
  const snaps = await Promise.all(
    uids.slice(0, 30).map(u => fs.getDoc(fs.doc(db, 'profiles', u))));
  return snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() }));
}

/* ------------------------------------------------------------ the hook */

const LAST_KEY = uid => `ferox.v2.pub.${uid}`;

const readLast = uid => {
  try { return JSON.parse(localStorage.getItem(LAST_KEY(uid)) ?? 'null'); }
  catch { return null; }
};
const writeLast = (uid, rec) => {
  try { localStorage.setItem(LAST_KEY(uid), JSON.stringify(rec)); } catch { /* private mode */ }
};

/**
 * Publish this athlete's public profile if anything worth showing has moved.
 *
 * Called on every page boot, which sounds expensive and is not: the throttle
 * record lives in localStorage, so the common case — nothing changed, or
 * changed twenty minutes ago — costs zero reads and zero writes and never
 * touches the network. Keeping the record out of the Firestore document is
 * the point; storing it there would mean a read to decide whether to write.
 *
 * Deliberately never throws into the caller. A public profile failing to
 * update is not a reason for someone's dashboard to fall over.
 */
export async function syncPublicProfile(uid, data, stats) {
  if (!uid || !firebaseConfigured()) return;
  try {
    const next = publicProfileFrom(data, stats, uid);
    if (!next.handle) return;                       // nothing claimed yet
    const sent = await publishProfile(uid, next, readLast(uid));
    if (sent) writeLast(uid, sent);
  } catch (err) {
    console.info('[ferox] public profile not updated:', err?.code ?? err?.message ?? err);
  }
}

/** Forget the throttle, so the next boot republishes. For a handle change. */
export function forgetPublished(uid) {
  try { localStorage.removeItem(LAST_KEY(uid)); } catch { /* ignore */ }
}
