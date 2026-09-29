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
import { EXERCISES, MEDALS, byId } from './seed.js';

export const todayISO = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const daysAgoISO = n => todayISO(new Date(Date.now() - n * 864e5));
const uid = () => (crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Shape of a fresh account. */
function emptyData() {
  return {
    version: 2,
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
    weights: [],    // { date, kg }
    medals: [],     // earned medal ids
    friends: [],
    seasons: {},    // { [slotId]: seasonId } — the training year, see core/seasons.js
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
    for (const k of ['sessions', 'meals', 'weights', 'medals', 'friends']) {
      if (!Array.isArray(d[k])) d[k] = [];
    }
    if (!d.seasons || typeof d.seasons !== 'object' || Array.isArray(d.seasons)) d.seasons = {};
    if (!d.readiness || typeof d.readiness !== 'object' || Array.isArray(d.readiness)) d.readiness = {};
    if (!Array.isArray(d.profile.limits)) d.profile.limits = [];
    d.onboarded = Boolean(raw.onboarded);
    d.layout = [3, 4, 6].includes(raw.layout) ? raw.layout : 4;
    d.planStart = raw.planStart ?? base.planStart;
    d.version = 2;
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

  /** Wipe everything back to a brand-new account. */
  async reset() {
    this.#data = emptyData();
    await this.#adapter.save(this.#data);
    this.#emit();
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
