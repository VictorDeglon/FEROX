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
  // The handle row is the search index and is read far more than it is
  // written, so it never carries an uploaded avatar — see publicPicture.
  picture = publicPicture(picture);
  const v = validateHandle(raw);
  if (!v.ok) { const e = new Error(v.why); e.code = 'invalid'; throw e; }
  const handle = v.handle;
  if (handle === previous) return handle;

  const { db, fs } = await boot();
  await fs.runTransaction(db, async tx => {
    const ref = fs.doc(db, 'handles', handle);
    const mine = fs.doc(db, 'profiles', uid);

    // Firestore wants every read before every write.
    const [snap, prof] = await Promise.all([tx.get(ref), tx.get(mine)]);

    if (snap.exists() && snap.data().uid !== uid) {
      const e = new Error('Already taken.'); e.code = 'taken'; throw e;
    }

    /*
     * The handle to release is whatever the *server* says we hold, not
     * whatever the caller remembered.
     *
     * Trusting the caller orphaned handles for real. `store.reset()` wipes
     * `profile.handle`, so someone who signed in, claimed a name and then
     * chose "start fresh" came back with an empty handle, was prompted
     * again, and claimed a second one with `previous: ''` — leaving the
     * first held forever by an account that no longer knew it had it.
     * One athlete ended up holding two.
     *
     * The profile document is the authority and it costs one read inside a
     * transaction we were already running.
     */
    const held = prof.exists() ? prof.data().handle : '';
    const release = held || previous;
    if (release && release !== handle) tx.delete(fs.doc(db, 'handles', release));

    tx.set(ref, { uid, nickname, picture });
    tx.set(mine, { handle, nickname, picture }, { merge: true });
  });
  return handle;
}

/**
 * Give a handle back, so somebody else can have it.
 *
 * Changing handle already releases the old one inside `claimHandle`'s
 * transaction. This is the other door: erasing an account. Without it a
 * handle stays claimed by a profile that no longer exists, and the name is
 * gone forever for everybody — which is the one failure mode of using a
 * global namespace that users will actually notice.
 *
 * The public profile goes too. Leaving it behind would mean a friend's
 * leaderboard still showing numbers for somebody who deleted themselves.
 *
 * Never throws: erasing an account must not fail because the network did.
 */
export async function releaseHandle(uid, handle) {
  if (!uid || !firebaseConfigured()) return false;
  const v = validateHandle(handle);
  try {
    const { db, fs } = await boot();
    if (v.ok) {
      // Only if it is still ours — a handle already re-claimed by somebody
      // else must not be deleted out from under them.
      const ref = fs.doc(db, 'handles', v.handle);
      const snap = await fs.getDoc(ref);
      if (snap.exists() && snap.data().uid === uid) await fs.deleteDoc(ref);
    }
    await fs.deleteDoc(fs.doc(db, 'profiles', uid));
    forgetPublished(uid);
    return true;
  } catch (err) {
    console.info('[ferox] could not release handle:', err?.code ?? err);
    return false;
  }
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
  'streak', 'sessions', 'volume', 'medals', 'friends',
  // Matching fields. Deliberately coarse — a band and a continent, never an
  // age or a place — and switched off entirely by `discoverable: false`.
  'goal', 'band', 'region', 'discoverable',
  // The public half of this device's messaging key. Public by definition:
  // it is what other people encrypt *to*. The private half never leaves the
  // browser — see core/crypto.js.
  'pk'];

/**
 * A number fit to publish.
 *
 * `Math.max(0, NaN)` is `NaN`, so clamping alone lets a broken stat through —
 * and Firestore stores NaN quite happily, which means it then comes back and
 * renders as "NaN sessions" on a public page.
 */
const stat = v => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

/**
 * A picture fit to publish: an absolute https URL, and nothing else.
 *
 * Uploaded avatars are stored as `data:image/webp;base64,...` in the private
 * document, which is the right place for them — it is the athlete's own
 * device and their own data. Copying one into a *public* document is not:
 *
 *   it is 9–23 KB where the whole document should be a few hundred bytes,
 *   and it lands in `handles` too, which is the search index — so every
 *   result row in a search for "vic" dragged down somebody's entire avatar.
 *   That is roughly seventy times the intended read, on the hottest path
 *   there is.
 *
 * It also quietly broke: the rules cap `picture` at 500 characters, so once
 * that cap existed those profiles could no longer be written at all and sat
 * frozen while every publish failed.
 *
 * So the public copy carries the Google-hosted URL if there is one, and
 * otherwise nothing — a viewer sees initials. A custom avatar stays on the
 * device that uploaded it. Making it public would mean paying to store and
 * serve files, which is the thing this design is built to avoid.
 */
const publicPicture = url => {
  const v = String(url ?? '').trim();
  if (!v || v.length > 500 || !v.startsWith('https://')) return '';
  return v;
};

/** Build the public view of an athlete from their private document. */
export function publicProfileFrom(data, stats, uid) {
  const p = data?.profile ?? {};
  return {
    uid,
    handle: p.handle ?? '',
    nickname: (p.name ?? '').trim().slice(0, 40),
    picture: publicPicture(p.picture),
    joined: p.joined ?? '',
    streak: stat(stats?.streak),
    sessions: stat(stats?.sessions),
    volume: stat(stats?.volume),
    medals: stat((data?.medals ?? []).length),
    // A count, never the list. Who somebody trains with is theirs.
    friends: stat((data?.friends ?? []).filter(f => f.uid).length),

    // Opting out blanks the matching fields rather than merely hiding the
    // profile: the right to not be suggested should remove the data that
    // does the suggesting, not leave it sitting there unused.
    pk: p.pk ?? '',
    discoverable: p.discoverable !== false,
    goal: p.discoverable === false ? '' : (p.goal ?? ''),
    band: p.discoverable === false ? '' : ageBand(p.age),
    region: p.discoverable === false ? '' : (p.region || detectRegion()),
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

  /*
   * Confirm the handle is still ours before writing it anywhere.
   *
   * `next.handle` comes from the local store, and a second device can be
   * carrying a handle this account gave up — the claim transaction updates
   * the profile and the handle row, but it cannot reach into another
   * browser's localStorage. Without this check that stale device republishes
   * the old handle into its own profile and two profiles end up claiming the
   * same name. It happened, on this project, to the two accounts that had
   * signed in during testing.
   *
   * `handles/{handle}` is the only authority on who owns what, so it is asked.
   * One read, and only on a write we were already going to make.
   */
  let handle = next.handle;
  if (handle) {
    const owner = await fs.getDoc(fs.doc(db, 'handles', handle));
    if (!owner.exists() || owner.data().uid !== uid) {
      // Not ours any more. Publish everything *except* the handle, and tell
      // the caller so it can drop the stale one locally.
      handle = '';
    }
  }

  const doc = { ...next, handle, updatedAt: fs.serverTimestamp() };
  await fs.setDoc(fs.doc(db, 'profiles', uid), doc, { merge: true });

  // The search index carries the three fields a result row shows, so finding
  // somebody never has to read their profile as well.
  if (handle) {
    await fs.setDoc(fs.doc(db, 'handles', handle),
      { uid, nickname: next.nickname, picture: next.picture }, { merge: true });
  }
  return { ...next, handle, at: now, lostHandle: Boolean(next.handle) && !handle };
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
    if (!sent) return;
    writeLast(uid, sent);

    // The handle went while this device was not looking. Clearing it locally
    // is what stops the next publish trying again, and puts the "claim a
    // handle" prompt back in front of them rather than leaving them with a
    // name that quietly belongs to somebody else.
    if (sent.lostHandle) {
      const { store } = await import('./store.js');
      await store.updateProfile({ handle: '' });
      console.info('[ferox] this handle is no longer yours — cleared locally.');
    }
  } catch (err) {
    console.info('[ferox] public profile not updated:', err?.code ?? err?.message ?? err);
  }
}

/** Forget the throttle, so the next boot republishes. For a handle change. */
export function forgetPublished(uid) {
  try { localStorage.removeItem(LAST_KEY(uid)); } catch { /* ignore */ }
}

/* ------------------------------------------------- discovery and matching */

/**
 * Age as a band, never a number.
 *
 * A birth year on a public document is a identifying detail that buys the
 * feature nothing: "someone roughly my age" is the entire requirement, and a
 * band answers it. The bands are the ones training actually differs across
 * rather than even decades.
 */
export const AGE_BANDS = [
  { id: 'u20', label: 'Under 20', max: 19 },
  { id: '20s', label: '20s', max: 29 },
  { id: '30s', label: '30s', max: 39 },
  { id: '40s', label: '40s', max: 49 },
  { id: '50p', label: '50+', max: 200 },
];
export const ageBand = age =>
  (Number.isFinite(age) && age > 0 ? AGE_BANDS.find(b => age <= b.max)?.id ?? '' : '');

/**
 * Roughly where somebody is, from the browser's own time zone.
 *
 * A continent, not a city, and certainly not coordinates. The point of this
 * field is "trains at the same hours as me" — close enough that a leaderboard
 * resets at the same time and a message is not read nine hours late. A
 * geolocation prompt would be a worse answer to a smaller question, and it
 * would break the promise that nothing is sent anywhere by default.
 */
export function detectRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const area = tz.split('/')[0];
    return ['Africa', 'America', 'Antarctica', 'Asia', 'Atlantic', 'Australia',
      'Europe', 'Indian', 'Pacific'].includes(area) ? area : '';
  } catch { return ''; }
}

/** How well two public profiles match, 0–3. Used only to order suggestions. */
export function matchScore(me, them) {
  if (!me || !them) return 0;
  let n = 0;
  if (me.goal && me.goal === them.goal) n += 1;
  if (me.band && me.band === them.band) n += 1;
  if (me.region && me.region === them.region) n += 1;
  return n;
}

/** Why a person was suggested, in the words the card shows. */
export function matchReason(me, them) {
  const bits = [];
  if (me?.goal && me.goal === them.goal) bits.push('same goal');
  if (me?.band && me.band === them.band) bits.push('similar age');
  if (me?.region && me.region === them.region) bits.push('same region');
  if (!bits.length) return (them.streak ?? 0) > 0 ? 'training consistently' : 'new here';
  return bits.join(' · ');
}

/**
 * Up to five people worth training alongside.
 *
 * Three narrow queries, then a backfill, rather than one clever one. Each is
 * a single equality on a field Firestore indexes automatically, so this adds
 * no composite indexes to define or pay for — and a composite index is the
 * thing that makes a recommendation feature expensive, not the reads.
 *
 * The backfill is what keeps the promise of five. Early on there is nobody
 * matching anybody, and a discovery page that says "no suggestions" on launch
 * day is a page nobody opens twice, so it falls through to whoever is
 * actually training. Only when the whole app has fewer than five other
 * athletes does it return fewer than five, which is the one case where there
 * is nothing else to show.
 *
 * @param {object} me       my own public profile
 * @param {Set<string>} skip uids already added, plus my own
 */
export async function recommendPeople(me, skip = new Set(), want = 5) {
  if (!firebaseConfigured()) return [];
  const { db, fs } = await boot();
  const col = fs.collection(db, 'profiles');

  const run = async q => {
    try { return (await fs.getDocs(q)).docs.map(d => ({ uid: d.id, ...d.data() })); }
    catch { return []; }          // a missing index must not break the page
  };

  // Narrow first, in the order the matches are worth most.
  const narrow = [
    me?.goal && fs.query(col, fs.where('goal', '==', me.goal), fs.limit(12)),
    me?.band && fs.query(col, fs.where('band', '==', me.band), fs.limit(12)),
    me?.region && fs.query(col, fs.where('region', '==', me.region), fs.limit(12)),
  ].filter(Boolean);

  const found = new Map();
  for (const rows of await Promise.all(narrow.map(run))) {
    for (const r of rows) if (!found.has(r.uid)) found.set(r.uid, r);
  }

  const usable = r => r.handle && r.discoverable !== false && !skip.has(r.uid);
  let out = [...found.values()].filter(usable);

  // Nowhere near five? Fall back to whoever is training. `streak` is a single
  // field, so this is another automatic index.
  if (out.length < want) {
    const extra = await run(fs.query(col, fs.orderBy('streak', 'desc'), fs.limit(want * 4)));
    for (const r of extra) {
      if (!found.has(r.uid) && usable(r)) { found.set(r.uid, r); out.push(r); }
      if (out.length >= want * 3) break;
    }
  }

  return out
    .map(r => ({ ...r, score: matchScore(me, r), why: matchReason(me, r) }))
    .sort((a, b) => b.score - a.score || (b.streak ?? 0) - (a.streak ?? 0))
    .slice(0, want);
}

/* ------------------------------------------------------- friendships */

/**
 * One document per relationship, named after both people.
 *
 *     friendships/{a_b}   { users:[a,b], from, state, at }
 *     friendships/{a_b}/messages/{id}
 *
 * The id is both uids sorted and joined, which does three jobs at once: it
 * makes a duplicate request impossible without a query, it means either side
 * can compute the id without looking anything up, and it gives the messages
 * somewhere to live where the rules already know who is allowed in.
 *
 * `users` is an array so "everything I am part of" is one
 * `array-contains` query — a single-field index, which Firestore maintains
 * for free. The alternative, a document each way, doubles the writes and
 * invites the two copies to disagree about whether you are friends.
 */
export const pairId = (a, b) => [a, b].sort().join('_');

export const REQUEST_STATES = ['pending', 'accepted'];

/**
 * Ask somebody to connect.
 *
 * Idempotent by construction: the id is derived from the two uids, so asking
 * twice writes the same document twice rather than creating two requests. If
 * they already asked *you*, this accepts instead — two people reaching for
 * each other at the same moment should end up connected, not deadlocked.
 */
export async function requestFriend(myUid, theirUid) {
  if (!firebaseConfigured() || !myUid || !theirUid || myUid === theirUid) return null;
  const { db, fs } = await boot();
  const ref = fs.doc(db, 'friendships', pairId(myUid, theirUid));

  return fs.runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d.state === 'accepted') return 'accepted';
      // They asked first — treat this as the answer.
      if (d.from !== myUid) {
        tx.update(ref, { state: 'accepted', acceptedAt: fs.serverTimestamp() });
        return 'accepted';
      }
      return 'pending';
    }
    tx.set(ref, {
      users: [myUid, theirUid].sort(),
      from: myUid,
      state: 'pending',
      at: fs.serverTimestamp(),
    });
    return 'pending';
  });
}

/** Accept. Only the person who did not send it may do this — see the rules. */
export async function acceptFriend(myUid, theirUid) {
  const { db, fs } = await boot();
  await fs.updateDoc(fs.doc(db, 'friendships', pairId(myUid, theirUid)),
    { state: 'accepted', acceptedAt: fs.serverTimestamp() });
  return true;
}

/** Decline, cancel or unfriend — all the same thing: the document goes. */
export async function removeFriendship(myUid, theirUid) {
  const { db, fs } = await boot();
  await fs.deleteDoc(fs.doc(db, 'friendships', pairId(myUid, theirUid)));
  return true;
}

/**
 * Everything I am part of, in one query.
 *
 * @returns {{accepted:object[], incoming:object[], outgoing:object[]}}
 */
export async function myFriendships(myUid) {
  const empty = { accepted: [], incoming: [], outgoing: [] };
  if (!firebaseConfigured() || !myUid) return empty;
  const { db, fs } = await boot();

  let rows = [];
  try {
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, 'friendships'),
      fs.where('users', 'array-contains', myUid),
      fs.limit(300),
    ));
    rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.info('[ferox] could not load friendships:', err?.code ?? err);
    return empty;
  }

  const out = { ...empty };
  for (const r of rows) {
    const other = (r.users ?? []).find(u => u !== myUid);
    if (!other) continue;
    const row = { ...r, other };
    if (r.state === 'accepted') out.accepted.push(row);
    else if (r.from === myUid) out.outgoing.push(row);
    else out.incoming.push(row);
  }
  return out;
}

/* ---------------------------------------------------------- messaging */

/**
 * Send one encrypted message.
 *
 * The plaintext never leaves this function. What is written is a base64
 * ciphertext, a base64 IV and who sent it — see core/crypto.js for what that
 * does and does not protect.
 */
export async function sendMessage(myUid, theirUid, theirPublicKey, text) {
  const body = String(text ?? '').trim();
  if (!body) return null;
  const { encrypt, conversationKey, MAX_MESSAGE } = await import('./crypto.js');
  const id = pairId(myUid, theirUid);
  const key = await conversationKey(theirPublicKey, id);
  const payload = await encrypt(key, body.slice(0, MAX_MESSAGE));

  const { db, fs } = await boot();
  await fs.addDoc(fs.collection(db, 'friendships', id, 'messages'), {
    from: myUid, ...payload, at: fs.serverTimestamp(),
  });
  return true;
}

/**
 * Watch a conversation, decrypting as it arrives.
 *
 * A live subscription rather than polling: Firestore charges per document
 * read either way, and a listener only bills for what actually changes,
 * where polling bills for the whole window every time it fires.
 *
 * @returns {Promise<function>} unsubscribe
 */
export async function watchMessages(myUid, theirUid, theirPublicKey, onRows, limitTo = 100) {
  const { decrypt, conversationKey } = await import('./crypto.js');
  const id = pairId(myUid, theirUid);
  const key = await conversationKey(theirPublicKey, id);

  const { db, fs } = await boot();
  const q = fs.query(
    fs.collection(db, 'friendships', id, 'messages'),
    fs.orderBy('at', 'desc'),
    fs.limit(limitTo),
  );

  return fs.onSnapshot(q, async snap => {
    const rows = await Promise.all(snap.docs.map(async d => {
      const m = d.data();
      return {
        id: d.id,
        from: m.from,
        mine: m.from === myUid,
        at: m.at?.toDate?.() ?? null,
        // null means this device cannot read it — a key made after it was
        // sent, usually. One unreadable line, not a broken thread.
        text: await decrypt(key, m),
      };
    }));
    onRows(rows.reverse());
  }, err => console.info('[ferox] message stream:', err?.code ?? err));
}

/**
 * Make sure this device has a messaging key and that it is on the profile.
 *
 * Called lazily, the first time somebody opens the friends page — generating
 * a key pair costs nothing but it is still work nobody browsing their own
 * charts should pay for, and a guest never needs one at all.
 *
 * Republishes only when the key is new or different, so this is free on
 * every load after the first.
 */
export async function ensureMessagingKey(uid, profile) {
  if (!uid || !firebaseConfigured()) return null;
  try {
    const { cryptoReady, publicKeyJwk } = await import('./crypto.js');
    if (!cryptoReady()) return null;
    const jwk = await publicKeyJwk();
    if (profile?.pk === jwk) return jwk;

    const { store } = await import('./store.js');
    await store.updateProfile({ pk: jwk });
    forgetPublished(uid);
    return jwk;
  } catch (err) {
    console.info('[ferox] messaging key unavailable:', err?.message ?? err);
    return null;
  }
}
