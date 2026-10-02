/**
 * FEROX data layer.
 *
 * One public surface (`store`) backed by one of two adapters:
 *   LocalAdapter     — localStorage. The guest path, and the fallback whenever
 *                      the cloud is unreachable. Offline, no account, no server.
 *   FirestoreAdapter — one document per athlete at `users/{uid}`, used when
 *                      someone is signed in with Google.
 *
 * Pages never touch an adapter directly, so this file is the only place that
 * knows where an athlete's log physically lives.
 */
import { CONFIG, firebaseConfigured } from './config.js';
import { boot } from './firebase.js';
import { detectUnit } from './units.js';
import { EXERCISES, FOODS, MEDALS, byId } from './seed.js';

export const todayISO = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const daysAgoISO = n => todayISO(new Date(Date.now() - n * 864e5));
const uid = () => (crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Default settings. Split out so `#migrate` can fill gaps field by field. */
export const DEFAULT_SETTINGS = {
  /** Days between weigh-in prompts. 0 turns the prompt off entirely. */
  weighInEvery: 2,
  /** Days between the checkpoints that re-read the plan against reality. */
  checkpointEvery: 14,
  /** Colour palette id — see core/themes.js. Unlocked ones only. */
  palette: 'ember',
  /** Show the computed pacers on the leaderboard. See core/pacers.js. */
  pacers: true,
  /** The last date the weigh-in prompt was shown, so it asks once a day at most. */
  lastWeighInPrompt: '',
};

/** Shape of a fresh account. */
function emptyData() {
  return {
    version: 3,
    profile: {
      name: '', email: '', picture: '', handle: '',
      unit: detectUnit(), joined: todayISO(),
      // Filled by onboarding; everything is editable afterwards.
      sex: '', age: null, heightCm: null, weightKg: null,
      activity: 3, level: 3, goal: '', daysPerWeek: 4,
      equipment: 'gym', limits: [],
      /** Opt out of being suggested to other athletes. See core/social.js. */
      discoverable: true,
      /** A continent, filled from the time zone — never a place. */
      region: '',
      /** This device's public messaging key (JWK). See core/crypto.js. */
      pk: '',
      /** Macro split preset — see DIETS in core/profile.js. */
      diet: 'balanced',
      goals: { kcal: 2200, protein: 150, carbs: 240, fat: 70, sessionsPerWeek: 4 },
    },
    onboarded: false,
    layout: 4,               // blocks in the training year
    planStart: todayISO(),   // week 0 of the ramp
    readiness: {},           // { [date]: 1-10 }
    sessions: [],   // { id, date, name, durationMin, entries:[{ex,sets:[{reps,weight}]}], note }
    meals: [],      // { id, date, meal, foodId, name, qty, kcal, p, c, f }
    weights: [],    // { date, kg } — the canonical bodyweight series
    medals: [],     // earned medal ids
    friends: [],
    seasons: {},    // { [slotId]: seasonId } — the training year, see core/seasons.js

    /**
     * Body composition over time. A check-in always carries a weight (which is
     * mirrored into `weights`, so every existing chart keeps working) and may
     * carry any of the optional measures. Sparse by design — someone with a
     * tape measure and no calipers should not be blocked from logging.
     */
    checkIns: [],   // { id, date, weightKg, bodyFat, leanKg, waistCm, restingHr, sleepH, energy, note }

    customFoods: [],// { id, name, per, kcal, p, c, f, custom: true }

    /**
     * Combinations worth remembering.
     *
     * `savedMeals` are the ones that have a name and can be logged in one tap.
     * `mealPatterns` is the quiet half: every combination logged together is
     * fingerprinted and counted, and once the same one shows up twice FEROX
     * offers to save it. Nobody wants to be asked to name their breakfast the
     * first time they eat it.
     */
    savedMeals: [],   // { id, name, meal, items:[{foodId,qty}], kcal,p,c,f, uses, lastUsed }
    mealPatterns: {}, // { [fingerprint]: { items, count, lastSeen, dismissed } }
    water: {},      // { [date]: millilitres }
    settings: { ...DEFAULT_SETTINGS },
    unlocks: [],    // easter-egg ids — see core/eggs.js
  };
}

/* ---------------------------------------------------------------- adapters */

class LocalAdapter {
  constructor(key) { this.key = key; }
  read() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch { return null; }
  }
  write(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); return true; }
    catch { return false; }  // private mode / quota — the app still works in memory
  }
  async load() { return this.read() ?? emptyData(); }
  async save(data) { return this.write(data); }
}

/**
 * The whole log as one Firestore document at `users/{uid}`.
 *
 * One document, not a collection per list, for the same reason the server
 * before it kept one JSON file: the client is offline-first and writes the
 * entire log on every change, so a single atomic write means there is no merge
 * protocol to get wrong and no half-saved state to read back.
 *
 * The cost of that choice is Firestore's 1 MiB per-document ceiling. That is
 * a long way off — roughly a decade of daily meals and five sessions a week —
 * but it is a real ceiling rather than a theoretical one, so `save` checks and
 * says so plainly instead of letting Firestore fail with `INVALID_ARGUMENT`.
 * The fix, when someone eventually hits it, is to move `sessions` and `meals`
 * into subcollections; everything else in this file stays as it is.
 */
class FirestoreAdapter {
  /** Firestore's own hard limit, less headroom for field names and overhead. */
  static LIMIT = 1_048_576 - 24_576;

  constructor(uid) { this.uid = uid; }

  async #doc() {
    const { db, fs } = await boot();
    return { fs, ref: fs.doc(db, 'users', this.uid) };
  }

  /** @returns the stored document, or null when this account has none yet. */
  async load() {
    const { fs, ref } = await this.#doc();
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) return null;
    // `updatedAt` is the server's, not the app's. Dropping it here keeps it
    // out of the in-memory document — otherwise it round-trips as a Firestore
    // Timestamp, gets JSON-stringified into {seconds,nanoseconds} on the next
    // save, and quietly becomes a field the app neither sets nor understands.
    const { updatedAt, ...data } = snap.data();
    return data;
  }

  async save(data) {
    const { fs, ref } = await this.#doc();
    // Firestore rejects `undefined` outright; a JSON round-trip drops those
    // keys and flattens anything exotic the app may have picked up on the way.
    const clean = JSON.parse(JSON.stringify(data));
    const bytes = new TextEncoder().encode(JSON.stringify(clean)).length;
    if (bytes > FirestoreAdapter.LIMIT) {
      throw new Error(`This log is ${(bytes / 1048576).toFixed(2)} MB, over the 1 MB `
        + 'per-account limit. Export it from your profile and trim old sessions.');
    }
    await fs.setDoc(ref, { ...clean, updatedAt: fs.serverTimestamp() });
    return true;
  }
}

/* ------------------------------------------------------------------- store */

class Store extends EventTarget {
  #data = emptyData();
  #adapter = new LocalAdapter(CONFIG.storageKey);
  #ready = false;
  #fresh = false;

  get data() { return this.#data; }
  get ready() { return this.#ready; }
  /**
   * True when `init` found no document for this account and had to make one.
   * The landing page uses it to tell "first sign-in ever" apart from "signing
   * back in", which are the same event to Firebase and very different to a
   * person with two years of training in the cloud.
   */
  get freshAccount() { return this.#fresh; }

  /**
   * The athlete's display unit, 'kg' or 'lb'.
   *
   * Storage is metric regardless — see core/units.js. This is only ever asked
   * when something is about to be shown or typed, never when it is saved.
   */
  get unit() { return this.#data.profile.unit === 'lb' ? 'lb' : 'kg'; }

  /** Swap display units. Nothing stored changes; the numbers are the same. */
  setUnit(unit) { return this.updateProfile({ unit: unit === 'lb' ? 'lb' : 'kg' }); }

  /** True when writes are going to Firestore rather than this device. */
  get isCloud() { return this.#adapter instanceof FirestoreAdapter; }

  /**
   * Pick an adapter and load.
   *
   * `uid` is the Firebase uid of a verified account, or null for a guest —
   * see core/auth.js. Passing it is the single switch between "this device"
   * and "this account", so the two can never disagree.
   *
   * A cloud load that fails falls back to local storage rather than throwing.
   * Someone mid-workout with no signal should see their log, not an error, and
   * Firestore's own cache means this only fires on a genuinely cold failure.
   */
  async init({ uid = null } = {}) {
    if (uid && firebaseConfigured()) {
      try {
        const cloud = new FirestoreAdapter(uid);
        const doc = await cloud.load();
        this.#adapter = cloud;

        this.#fresh = !doc;

        if (doc) {
          this.#data = this.#migrate(doc);
        } else {
          // First sight of this account. Whatever is on this device is the
          // best starting point there is — and landing.js has already asked
          // whether to keep it, so an empty local store means they said no.
          const local = new LocalAdapter(CONFIG.storageKey).read();
          this.#data = local ? this.#migrate(local) : emptyData();
          await cloud.save(this.#data);
        }

        this.#ready = true;
        await this.#backfillMedals();
        this.#emit();
        return this;
      } catch (err) {
        console.info('[ferox] cloud log unavailable — using this device.', err?.message ?? err);
      }
    }

    const local = new LocalAdapter(CONFIG.storageKey);
    const existing = local.read();
    this.#adapter = local;
    // A new account starts genuinely empty. Onboarding fills it in, and the
    // first numbers someone sees are their own rather than a stranger's demo.
    this.#data = existing ? this.#migrate(existing) : emptyData();
    if (!existing) await this.#adapter.save(this.#data);
    this.#ready = true;
    await this.#backfillMedals();
    this.#emit();
    return this;
  }

  /**
   * Forget this device's copy after it has been taken up into an account.
   *
   * Called once, by the landing page, when someone signs in and chooses to
   * start fresh. Leaving a stale log behind would mean signing out drops them
   * back into data they thought they had discarded.
   */
  clearLocal() {
    try { localStorage.removeItem(CONFIG.storageKey); return true; }
    catch { return false; }
  }

  /** Does this *device* hold a log, regardless of what the account holds? */
  static deviceHasData() {
    const raw = new LocalAdapter(CONFIG.storageKey).read();
    if (!raw) return false;
    return Boolean(raw.onboarded || raw.sessions?.length || raw.meals?.length || raw.weights?.length);
  }

  /**
   * Medals are normally granted on write, so a log loaded from storage (or the
   * seeded demo history) would otherwise show an empty cabinet. Settle up once
   * on load and persist only if something was actually earned.
   */
  async #backfillMedals() {
    if (this.evaluateMedals().length) await this.#adapter.save(this.#data);
  }

  /** Tolerate data written by an older build rather than throwing it away. */
  #migrate(raw) {
    const base = emptyData();
    const d = { ...base, ...raw, profile: { ...base.profile, ...(raw.profile ?? {}) } };
    d.profile.goals = { ...base.profile.goals, ...(raw.profile?.goals ?? {}) };
    for (const k of ['sessions', 'meals', 'weights', 'medals', 'friends', 'checkIns',
      'customFoods', 'unlocks', 'savedMeals']) {
      if (!Array.isArray(d[k])) d[k] = [];
    }
    for (const k of ['seasons', 'readiness', 'water', 'mealPatterns']) {
      if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {};
    }
    if (!Array.isArray(d.profile.limits)) d.profile.limits = [];
    d.settings = { ...base.settings, ...(raw.settings ?? {}) };
    d.onboarded = Boolean(raw.onboarded);
    d.layout = [3, 4, 6].includes(raw.layout) ? raw.layout : 4;
    d.planStart = raw.planStart ?? base.planStart;

    // v2 kept only a bodyweight series. Promote it so the body-composition
    // charts have a history on the first load after upgrading, rather than
    // showing an empty card to someone with two years of weigh-ins.
    if (!d.checkIns.length && d.weights.length) {
      d.checkIns = d.weights.map(w => ({ id: uid(), date: w.date, weightKg: w.kg }));
    }
    d.checkIns.sort((a, b) => a.date.localeCompare(b.date));
    d.version = 3;
    return d;
  }

  #emit() { this.dispatchEvent(new CustomEvent('change', { detail: this.#data })); }

  /** Mutate + persist + notify. All writers go through here. */
  async commit(fn) {
    fn(this.#data);
    this.evaluateMedals();
    await this.#adapter.save(this.#data);
    this.#emit();
    return this.#data;
  }

  onChange(handler) {
    this.addEventListener('change', e => handler(e.detail));
    if (this.#ready) handler(this.#data);
    return () => this.removeEventListener('change', handler);
  }

  /* ---- writers ---- */

  addSession(session) {
    const rec = { id: uid(), date: todayISO(), durationMin: 45, entries: [], note: '', ...session };
    return this.commit(d => { d.sessions.unshift(rec); }).then(() => rec);
  }
  removeSession(id) { return this.commit(d => { d.sessions = d.sessions.filter(s => s.id !== id); }); }

  addMeal(meal) {
    const rec = { id: uid(), date: todayISO(), meal: 'Snack', qty: 1, ...meal };
    return this.commit(d => { d.meals.unshift(rec); }).then(() => rec);
  }
  removeMeal(id) { return this.commit(d => { d.meals = d.meals.filter(m => m.id !== id); }); }

  logWeight(kg, date = todayISO()) {
    return this.commit(d => {
      const hit = d.weights.find(w => w.date === date);
      if (hit) hit.kg = kg; else d.weights.push({ date, kg });
      d.weights.sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * A body-composition check-in.
   *
   * The weight is mirrored into `weights` because that series is what every
   * existing chart, medal and trend reads — a check-in is a richer way to write
   * the same fact, not a second source of truth for bodyweight.
   */
  logCheckIn(entry) {
    const date = entry.date ?? todayISO();
    const clean = { id: uid(), ...entry, date };
    for (const k of ['weightKg', 'bodyFat', 'leanKg', 'waistCm', 'restingHr', 'sleepH', 'energy']) {
      const v = Number(clean[k]);
      if (!Number.isFinite(v) || v <= 0) delete clean[k];
      else clean[k] = v;
    }
    return this.commit(d => {
      const at = d.checkIns.findIndex(c => c.date === date);
      if (at >= 0) clean.id = d.checkIns[at].id, d.checkIns[at] = clean;
      else d.checkIns.push(clean);
      d.checkIns.sort((a, b) => a.date.localeCompare(b.date));

      if (clean.weightKg) {
        const hit = d.weights.find(w => w.date === date);
        if (hit) hit.kg = clean.weightKg; else d.weights.push({ date, kg: clean.weightKg });
        d.weights.sort((a, b) => a.date.localeCompare(b.date));
        d.profile.weightKg = clean.weightKg;       // the plan reads from the profile
      }
      if (clean.heightCm > 0) d.profile.heightCm = clean.heightCm;
      d.settings.lastWeighInPrompt = todayISO();
    }).then(() => clean);
  }

  removeCheckIn(id) {
    return this.commit(d => {
      const gone = d.checkIns.find(c => c.id === id);
      d.checkIns = d.checkIns.filter(c => c.id !== id);
      if (gone && !d.checkIns.some(c => c.date === gone.date)) {
        d.weights = d.weights.filter(w => w.date !== gone.date);
      }
    });
  }

  /** The most recent value of one measure, or null if it was never recorded. */
  latestMeasure(key) {
    for (let i = this.#data.checkIns.length - 1; i >= 0; i--) {
      const v = this.#data.checkIns[i][key];
      if (Number.isFinite(v) && v > 0) return { value: v, date: this.#data.checkIns[i].date };
    }
    return null;
  }

  /** One measure as a date-ordered series, skipping the check-ins that omit it. */
  measureSeries(key) {
    return this.#data.checkIns
      .filter(c => Number.isFinite(c[key]) && c[key] > 0)
      .map(c => ({ date: c.date, value: c[key] }));
  }

  /** Whether the weigh-in prompt is due, and why. */
  weighInDue(today = todayISO()) {
    const every = this.#data.settings.weighInEvery;
    if (!every) return { due: false, reason: 'off' };
    if (this.#data.settings.lastWeighInPrompt === today) return { due: false, reason: 'asked today' };
    const last = this.#data.checkIns.at(-1);
    if (!last) return { due: true, reason: 'first' };
    const days = Math.floor((Date.parse(today) - Date.parse(last.date)) / 864e5);
    return { due: days >= every, reason: `${days} day${days === 1 ? '' : 's'} since the last one`, days };
  }

  /** Remember the prompt was shown, so a dismissal is not re-asked all day. */
  noteWeighInPrompt(date = todayISO()) {
    return this.commit(d => { d.settings.lastWeighInPrompt = date; });
  }

  /* ---- saved meals ---- */

  /**
   * A fingerprint for a combination of foods.
   *
   * Sorted ids and nothing else: the same plate with the portions nudged is
   * still the same plate, and someone who always has two eggs one day and
   * three the next should not be offered two different saved breakfasts.
   */
  static fingerprint(items) {
    return [...new Set(items.map(i => i.foodId).filter(Boolean))].sort().join('+');
  }

  /**
   * Note that these foods were logged together.
   *
   * Called after a meal is logged. Nothing is saved and nothing is asked on the
   * first sighting — it just counts. `suggestibleMeal()` is what decides when
   * the count is high enough to be worth mentioning.
   */
  noteMealPattern(items, meal) {
    const key = Store.fingerprint(items);
    if (!key || items.length < 2) return Promise.resolve(null);
    return this.commit(d => {
      const hit = d.mealPatterns[key] ?? { items: [], count: 0, dismissed: false };
      d.mealPatterns[key] = {
        ...hit,
        meal,
        items: items.map(i => ({ foodId: i.foodId, qty: i.qty })),
        count: hit.count + 1,
        lastSeen: todayISO(),
      };
    }).then(() => key);
  }

  /**
   * A combination logged more than once, not yet saved and not yet declined.
   * This is the whole point of the quiet counting.
   */
  suggestibleMeal(minCount = 2) {
    const saved = new Set(this.#data.savedMeals.map(m => Store.fingerprint(m.items)));
    for (const [key, pat] of Object.entries(this.#data.mealPatterns)) {
      if (pat.dismissed || pat.count < minCount || saved.has(key)) continue;
      return { key, ...pat };
    }
    return null;
  }

  /** "Don't ask me about this one again." */
  dismissMealPattern(key) {
    return this.commit(d => { if (d.mealPatterns[key]) d.mealPatterns[key].dismissed = true; });
  }

  saveMeal(meal) {
    const rec = { id: `sm-${uid().slice(0, 8)}`, uses: 0, lastUsed: null, ...meal };
    return this.commit(d => { d.savedMeals.unshift(rec); }).then(() => rec);
  }
  removeSavedMeal(id) {
    return this.commit(d => { d.savedMeals = d.savedMeals.filter(m => m.id !== id); });
  }
  noteMealUsed(id) {
    return this.commit(d => {
      const m = d.savedMeals.find(x => x.id === id);
      if (m) { m.uses = (m.uses ?? 0) + 1; m.lastUsed = todayISO(); }
      // Most-used first, so the thing you eat every morning stays at the top.
      d.savedMeals.sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0));
    });
  }

  addCustomFood(food) {
    const rec = { id: `cf-${uid().slice(0, 8)}`, per: '1 serving', custom: true, ...food };
    return this.commit(d => { d.customFoods.unshift(rec); }).then(() => rec);
  }
  removeCustomFood(id) {
    return this.commit(d => { d.customFoods = d.customFoods.filter(f => f.id !== id); });
  }
  /** The seed catalogue plus anything this athlete added, custom first. */
  foodCatalogue() { return [...this.#data.customFoods, ...FOODS]; }

  logWater(ml, date = todayISO()) {
    return this.commit(d => {
      d.water[date] = Math.max(0, Math.round((d.water[date] ?? 0) + ml));
      if (!d.water[date]) delete d.water[date];
    });
  }
  setWater(ml, date = todayISO()) {
    return this.commit(d => { d.water[date] = Math.max(0, Math.round(ml)); });
  }
  waterFor(date = todayISO()) { return this.#data.water[date] ?? 0; }

  updateSettings(patch) {
    return this.commit(d => { Object.assign(d.settings, patch); });
  }

  /** Record an easter-egg unlock. Returns false if it was already held. */
  async unlock(id) {
    if (this.#data.unlocks.includes(id)) return false;
    await this.commit(d => { d.unlocks.push(id); });
    return true;
  }
  hasUnlock(id) { return this.#data.unlocks.includes(id); }

  updateProfile(patch) {
    return this.commit(d => {
      Object.assign(d.profile, patch);
      if (patch.goals) d.profile.goals = { ...d.profile.goals, ...patch.goals };
    });
  }

  /** Record onboarding answers and the plan they imply, in one commit. */
  completeOnboarding({ profile, goals, seasons, layout }) {
    return this.commit(d => {
      Object.assign(d.profile, profile);
      d.profile.goals = { ...d.profile.goals, ...goals };
      d.seasons = { ...seasons };
      d.layout = layout ?? d.layout;
      d.onboarded = true;
      d.planStart = todayISO();
    });
  }

  /** Today's self-reported readiness, 1–10. */
  setReadiness(score, date = todayISO()) {
    return this.commit(d => { d.readiness[date] = Math.max(1, Math.min(10, Math.round(score))); });
  }
  readinessFor(date = todayISO()) { return this.#data.readiness[date] ?? null; }

  /** Whole weeks since the plan started — drives the week-one intensity ramp. */
  weekIndex() {
    const start = Date.parse(this.#data.planStart ?? todayISO());
    return Math.max(0, Math.floor((Date.now() - start) / (7 * 864e5)));
  }

  setLayout(n) { return this.commit(d => { d.layout = n; }); }

  /** Commit a season to a block, or pass null to empty it. */
  setSeason(slotId, seasonId) {
    return this.commit(d => {
      if (seasonId) d.seasons[slotId] = seasonId;
      else delete d.seasons[slotId];
    });
  }
  /** Replace the whole year at once. */
  setSeasons(map) { return this.commit(d => { d.seasons = { ...map }; }); }

  addFriend(friend) { return this.commit(d => { d.friends.push({ id: uid(), ...friend }); }); }
  removeFriend(id) { return this.commit(d => { d.friends = d.friends.filter(f => f.id !== id); }); }

  /** Wipe everything back to a brand-new account, onboarding included. */
  /**
   * Throw the training away and start again.
   *
   * `keepIdentity` carries the handle, name and picture across, because a
   * handle is not training data — it is a globally unique name this account
   * already holds, and wiping the local record of it does not release it.
   * It orphaned real handles: somebody signed in, claimed a name, chose
   * "start fresh", came back with an empty handle, was asked again, and
   * ended up holding two with no way to give the first one back.
   *
   * Erasing the account entirely is a different operation and releases the
   * handle properly first — see the profile page.
   */
  async reset({ keepIdentity = true } = {}) {
    const { handle, name, picture, email } = this.#data.profile;
    this.#data = emptyData();
    if (keepIdentity) Object.assign(this.#data.profile, { handle, name, picture, email });
    await this.#adapter.save(this.#data);
    this.#emit();
  }

  /**
   * What `resetProgress` throws away, and what it keeps.
   *
   * The split is the point: numbers you *earned* go, numbers you *are* stay.
   * Sessions, meals, medals and the plan clock are a record of performance, and
   * someone starting over wants those at zero. Body measurements and the
   * training year are facts about the athlete and the calendar — deleting them
   * would force a fresh onboarding and throw away the only history the
   * metabolism estimate has to work from.
   *
   * `RESET_CLEARS` and `RESET_KEEPS` below are exported so the confirmation
   * dialog lists exactly what this method does, rather than a prose summary
   * that can quietly drift out of step with the code.
   */
  async resetProgress() {
    return this.commit(d => {
      d.sessions = [];
      d.meals = [];
      d.medals = [];
      d.readiness = {};
      d.water = {};
      d.customFoods = [];
      d.savedMeals = [];
      d.mealPatterns = {};
      // The plan is a fresh start too: week one of the ramp begins today, and
      // the checkpoint schedule is measured from the same date.
      d.planStart = todayISO();
      d.settings.lastWeighInPrompt = '';
    });
  }

  /** Does this device hold anything worth offering to import on sign-in? */
  hasLocalData() {
    const d = this.#data;
    return d.sessions.length > 0 || d.meals.length > 0 || d.weights.length > 0 || d.onboarded;
  }

  /* ---- derived reads ---- */

  sessionVolume(session) {
    return (session.entries ?? []).reduce((tot, e) => {
      const ex = byId(EXERCISES, e.ex);
      if (ex?.kind !== 'strength') return tot;
      return tot + (e.sets ?? []).reduce((t, s) => t + (+s.reps || 0) * (+s.weight || 0), 0);
    }, 0);
  }

  /** Consecutive days with a session, counting back from today (or yesterday). */
  streak() {
    const dates = new Set(this.#data.sessions.map(s => s.date));
    if (!dates.size) return 0;
    let n = 0;
    let cursor = dates.has(todayISO()) ? 0 : (dates.has(daysAgoISO(1)) ? 1 : -1);
    if (cursor < 0) return 0;
    while (dates.has(daysAgoISO(cursor))) { n++; cursor++; }
    return n;
  }

  bestStreak() {
    const dates = [...new Set(this.#data.sessions.map(s => s.date))].sort();
    let best = 0, run = 0, prev = null;
    for (const d of dates) {
      run = prev && (Date.parse(d) - Date.parse(prev)) === 864e5 ? run + 1 : 1;
      prev = d;
      best = Math.max(best, run);
    }
    return best;
  }

  /** Best estimated 1RM per exercise (Epley), plus the set that produced it. */
  personalRecords() {
    const best = new Map();
    for (const s of this.#data.sessions) {
      for (const e of s.entries ?? []) {
        const ex = byId(EXERCISES, e.ex);
        if (!ex) continue;
        for (const set of e.sets ?? []) {
          const reps = +set.reps || 0;
          const weight = +set.weight || 0;
          const score = ex.kind === 'strength' && weight > 0
            ? weight * (1 + reps / 30)      // Epley 1RM estimate
            : reps;                          // bodyweight / time / distance: raw best
          if (!score) continue;
          const cur = best.get(e.ex);
          if (!cur || score > cur.score) {
            best.set(e.ex, { ex: e.ex, name: ex.name, muscle: ex.muscle, unit: ex.unit, kind: ex.kind, reps, weight, score, date: s.date });
          }
        }
      }
    }
    return [...best.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Totals for a single day's food log. */
  macrosFor(date = todayISO()) {
    return this.#data.meals.filter(m => m.date === date).reduce(
      (t, m) => ({ kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f }),
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
  }

  /** Days where calories landed within 10% of the target. */
  macroHitDays() {
    const target = this.#data.profile.goals.kcal;
    const byDate = new Map();
    for (const m of this.#data.meals) byDate.set(m.date, (byDate.get(m.date) ?? 0) + m.kcal);
    return [...byDate.values()].filter(v => Math.abs(v - target) <= target * 0.1).length;
  }

  /** Everything the medal predicates need. */
  stats() {
    const d = this.#data;
    return {
      sessions: d.sessions.length,
      // Four weeks back. Lifetime totals are the wrong comparison for
      // somebody who started on Tuesday — see core/pacers.js.
      last30: d.sessions.filter(s => s.date >= daysAgoISO(29)).length,
      volume: d.sessions.reduce((t, s) => t + this.sessionVolume(s), 0),
      streak: this.streak(),
      bestStreak: this.bestStreak(),
      prs: this.personalRecords().length,
      macroDays: this.macroHitDays(),
      friends: d.friends.length,
      earlyBird: d.sessions.some(s => s.startedAt && new Date(s.startedAt).getHours() < 7),
      minutes: d.sessions.reduce((t, s) => t + (+s.durationMin || 0), 0),
    };
  }

  /** Award any newly-qualified medals. Returns the ids granted this call. */
  evaluateMedals() {
    const s = this.stats();
    const owned = new Set(this.#data.medals);
    const fresh = MEDALS.filter(m => !owned.has(m.id) && m.test(s)).map(m => m.id);
    if (fresh.length) this.#data.medals.push(...fresh);
    return fresh;
  }

  /** Volume per day over the last `n` days, oldest first. */
  volumeSeries(n = 30) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = daysAgoISO(i);
      const v = this.#data.sessions.filter(s => s.date === date)
        .reduce((t, s) => t + this.sessionVolume(s), 0);
      out.push({ date, value: Math.round(v) });
    }
    return out;
  }

  /** Calories per day over the last `n` days, oldest first. */
  kcalSeries(n = 14) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = daysAgoISO(i);
      out.push({ date, value: Math.round(this.macrosFor(date).kcal) });
    }
    return out;
  }

  /** Session count per muscle group, for the focus breakdown. */
  muscleSplit() {
    const tally = {};
    for (const s of this.#data.sessions) {
      for (const e of s.entries ?? []) {
        const ex = byId(EXERCISES, e.ex);
        if (ex) tally[ex.muscle] = (tally[ex.muscle] ?? 0) + (e.sets?.length ?? 0);
      }
    }
    return Object.entries(tally).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }

  /** Water logged per day over the last `n` days, oldest first. */
  waterSeries(n = 14) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = daysAgoISO(i);
      out.push({ date, value: this.#data.water[date] ?? 0 });
    }
    return out;
  }

  /** Macro totals per day over the last `n` days, oldest first. */
  macroSeries(n = 14) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = daysAgoISO(i);
      out.push({ date, ...this.macrosFor(date) });
    }
    return out;
  }

  /** Every date with at least one meal on it. */
  loggedFoodDays() { return new Set(this.#data.meals.map(m => m.date)); }

  export() { return JSON.stringify(this.#data, null, 2); }

  async import(json) {
    const parsed = JSON.parse(json);
    this.#data = this.#migrate(parsed);
    await this.#adapter.save(this.#data);
    this.#emit();
  }
}

export const store = new Store();
export { emptyData, uid, Store };

/** What `store.resetProgress()` deletes, in the order the dialog lists them. */
export const RESET_CLEARS = [
  'Sessions and training volume',
  'Every meal and macro logged',
  'Medals and personal records',
  'Daily readiness scores',
  'Water intake',
  'Custom foods and saved meals',
];
/** ...and what survives it. */
export const RESET_KEEPS = [
  'Weigh-ins and body measurements',
  'Height, age, sex and units',
  'Your training year and seasons',
  'Friends',
  'Themes, unlocks and settings',
];
