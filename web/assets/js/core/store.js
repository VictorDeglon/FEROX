/**
 * FEROX data layer.
 *
 * One public surface (`store`) backed by one of two adapters:
 *   LocalAdapter  — localStorage. Default. Works on GitHub Pages, offline, no server.
 *   RemoteAdapter — the FEROX API, used when CONFIG.apiBase is set and reachable.
 *
 * Pages never touch an adapter directly, so moving a user's data to a server
 * (or later, to a native app's storage) is a change in exactly one place.
 */
import { CONFIG } from './config.js';
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
  /** The last date the weigh-in prompt was shown, so it asks once a day at most. */
  lastWeighInPrompt: '',
};

/** Shape of a fresh account. */
function emptyData() {
  return {
    version: 3,
    profile: {
      name: '', email: '', picture: '', handle: '',
      unit: 'kg', joined: todayISO(),
      // Filled by onboarding; everything is editable afterwards.
      sex: '', age: null, heightCm: null, weightKg: null,
      activity: 3, level: 3, goal: '', daysPerWeek: 4,
      equipment: 'gym', limits: [],
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

class RemoteAdapter {
  constructor(base, token) { this.base = base.replace(/\/$/, ''); this.token = token; }
  async #req(path, init = {}) {
    const res = await fetch(this.base + path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  async load() { return this.#req('/api/data'); }
  async save(data) { await this.#req('/api/data', { method: 'PUT', body: JSON.stringify(data) }); return true; }
}

/* ------------------------------------------------------------------- store */

class Store extends EventTarget {
  #data = emptyData();
  #adapter = new LocalAdapter(CONFIG.storageKey);
  #ready = false;

  get data() { return this.#data; }
  get ready() { return this.#ready; }
  get isRemote() { return this.#adapter instanceof RemoteAdapter; }

  /** Pick an adapter, load, backfill demo data for first-time guests. */
  async init({ token } = {}) {
    if (CONFIG.apiBase) {
      const remote = new RemoteAdapter(CONFIG.apiBase, token);
      try {
        this.#data = this.#migrate(await remote.load());
        this.#adapter = remote;
        this.#ready = true;
        await this.#backfillMedals();
        this.#emit();
        return this;
      } catch {
        console.info('[ferox] API unreachable — falling back to local storage.');
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
    for (const k of ['sessions', 'meals', 'weights', 'medals', 'friends', 'checkIns', 'customFoods', 'unlocks']) {
      if (!Array.isArray(d[k])) d[k] = [];
    }
    for (const k of ['seasons', 'readiness', 'water']) {
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
  async reset() {
    this.#data = emptyData();
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
export { emptyData, uid };

/** What `store.resetProgress()` deletes, in the order the dialog lists them. */
export const RESET_CLEARS = [
  'Sessions and training volume',
  'Every meal and macro logged',
  'Medals and personal records',
  'Daily readiness scores',
  'Water intake',
  'Custom foods you added',
];
/** ...and what survives it. */
export const RESET_KEEPS = [
  'Weigh-ins and body measurements',
  'Height, age, sex and units',
  'Your training year and seasons',
  'Friends',
  'Themes, unlocks and settings',
];
