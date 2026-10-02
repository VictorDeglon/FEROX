/** Nutrition — the diet tracker: log food, watch macros, keep the plan honest. */
import { store, todayISO } from '../core/store.js';
import { bootPage, esc, num, pct, toast, modal, confirmDialog } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { ring, barChart, lineChart, breakdown, VIZ } from '../core/chart.js';
import { FOODS, MEALS, byId } from '../core/seed.js';
import { pickFood, plateBuilder, scale, totals, searchFoods } from './_plate.js';
import { photoFlow, photoAvailable } from './_photo.js';
import { planStatus } from '../core/plan.js';
import { adherence } from '../core/metabolism.js';

let day = todayISO();

/** One glass. Eight of them is the folk target, and it is close enough. */
const GLASS_ML = 250;

const shift = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const out = d.toISOString().slice(0, 10);
  return out > todayISO() ? todayISO() : out;
};

/** Everything in the catalogue, custom entries first so they are easy to reach. */
const catalogue = () => [...store.data.customFoods, ...FOODS];
const findFood = id => byId(catalogue(), id);

const view = await bootPage({
  title: 'Nutrition',
  actions: `
    <button class="btn btn-ghost btn-sm btn-icon" id="photoBtn" aria-label="Log a meal from a photo"
      title="Log a meal from a photo">${icon('camera')}</button>
    <button class="btn btn-ghost btn-sm" id="plateBtn">${icon('apple')}<span>Build a meal</span></button>
    <button class="btn btn-primary btn-sm" id="addFood">${icon('plus')}<span>Add food</span></button>`,
}, render);

document.getElementById('addFood').addEventListener('click', () => addFoodFlow());
document.getElementById('plateBtn').addEventListener('click', () => plateBuilder({ onDone: logPlate }));
document.getElementById('photoBtn').addEventListener('click', async () => {
  const res = await photoFlow();
  if (!res) return;
  // Whether or not an estimate came back, the plate builder is where it lands —
  // an estimate you cannot correct is worse than no estimate at all.
  plateBuilder({ onDone: logPlate });
});

function render(el) {
  const d = store.data;
  const goals = d.profile.goals;
  const m = store.macrosFor(day);
  const logged = d.meals.filter(x => x.date === day);
  const remaining = Math.max(0, goals.kcal - m.kcal);
  const over = m.kcal > goals.kcal;
  const water = store.waterFor(day);
  const waterGoal = waterTarget(d.profile);
  const plan = planStatus(d);
  const a = adherence(d, 28);

  el.innerHTML = `
    <div class="row-between wrap" style="gap:12px">
      <div class="row" style="gap:8px">
        <button class="btn btn-ghost btn-icon" id="prev" aria-label="Previous day" style="transform:rotate(180deg)">${icon('chevron')}</button>
        <input class="input" type="date" id="dayPick" value="${day}" max="${todayISO()}" style="width:auto">
        <button class="btn btn-ghost btn-icon" id="next" aria-label="Next day" ${day >= todayISO() ? 'disabled' : ''}>${icon('chevron')}</button>
      </div>
      <span class="chip ${over ? 'chip-warn' : 'chip-ok'}">
        ${over ? `${num(m.kcal - goals.kcal)} kcal over` : `${num(remaining)} kcal left`}
      </span>
    </div>

    <section class="grid grid-main">
      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="card-head"><h3>Macros</h3><span class="chip">Target ${num(goals.kcal)} kcal</span></div>
          <div class="row wrap" style="gap:28px;align-items:center">
            ${ring(
              [
                { value: m.p * 4, color: VIZ[1] },
                { value: m.c * 4, color: VIZ[3] },
                { value: m.f * 9, color: VIZ[2] },
              ],
              { max: goals.kcal, size: 156, stroke: 14,
                center: `<div><div class="stat-value" style="font-size:1.7rem">${num(m.kcal)}</div>
                         <div class="dim" style="font-size:.7rem">kcal today</div></div>` })}
            <div class="grow stack" style="gap:14px;min-width:210px">
              ${macro('Protein', m.p, goals.protein, VIZ[1])}
              ${macro('Carbs',   m.c, goals.carbs,   VIZ[3])}
              ${macro('Fat',     m.f, goals.fat,     VIZ[2])}
            </div>
          </div>
        </div>

        ${MEALS.map(meal => {
          const items = logged.filter(x => x.meal === meal);
          const sub = items.reduce((t, x) => t + x.kcal, 0);
          return `<div class="card card-pad-lg">
            <div class="card-head">
              <h3>${esc(meal)}</h3>
              <div class="row" style="gap:8px">
                <span class="chip num">${num(sub)} kcal</span>
                <button class="btn btn-ghost btn-sm" data-add="${esc(meal)}"
                  aria-label="Add food to ${esc(meal)}">${icon('plus')}</button>
              </div>
            </div>
            ${items.length ? `<div class="list">${items.map(x => `
              <div class="list-item">
                <div class="grow" style="min-width:0">
                  <strong>${esc(x.name)}</strong><br>
                  <small>${x.qty}× · ${num(x.kcal)} kcal · P ${x.p} / C ${x.c} / F ${x.f}</small>
                </div>
                <button class="btn btn-ghost btn-sm" data-edit="${x.id}" aria-label="Change servings of ${esc(x.name)}">${icon('settings')}</button>
                <button class="btn btn-ghost btn-sm" data-rm="${x.id}" aria-label="Remove ${esc(x.name)}">${icon('trash')}</button>
              </div>`).join('')}</div>`
              : `<p class="dim" style="font-size:.85rem">Nothing logged.</p>`}
          </div>`;
        }).join('')}

        <div class="card card-pad-lg">
          <div class="card-head">
            <h3>Water</h3>
            <span class="chip num ${water >= waterGoal ? 'chip-ok' : ''}">${(water / 1000).toFixed(1)} / ${(waterGoal / 1000).toFixed(1)} L</span>
          </div>
          <div class="water-row" aria-label="${Math.round(water / GLASS_ML)} of ${Math.round(waterGoal / GLASS_ML)} glasses">
            ${Array.from({ length: Math.round(waterGoal / GLASS_ML) }, (_, i) =>
              `<span class="water-cup${i * GLASS_ML < water ? ' full' : ''}"></span>`).join('')}
          </div>
          <div class="row wrap" style="gap:10px;margin-top:16px">
            <button class="btn btn-sm" data-water="${GLASS_ML}">${icon('plus')}<span>Glass</span></button>
            <button class="btn btn-sm" data-water="500">${icon('plus')}<span>500 ml</span></button>
            <button class="btn btn-ghost btn-sm" data-water="${-GLASS_ML}" ${water ? '' : 'disabled'}>Undo a glass</button>
          </div>
          <p class="dim" style="font-size:.75rem;margin-top:12px">
            Target is 35 ml per kg of bodyweight, plus half a litre on a training day.
            It is a rule of thumb, not a prescription — thirst and pale urine beat any number.</p>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Where your calories come from</h3><span class="chip">last 30 days</span></div>
          ${breakdown(topFoods(30), { fmt: v => `${num(v)} kcal` })}
        </div>
      </div>

      <div class="stack" style="gap:16px">
        ${mealNudge()}
        ${savedMealsCard()}
        ${targetCard(plan, a, goals)}

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Last 14 days</h3></div>
          ${barChart(store.kcalSeries(14), { height: 150, label: 'Daily calories', target: goals.kcal, fmt: v => `${num(v)} kcal` })}
          <div class="row wrap" style="gap:14px;margin-top:12px">
            <span class="dim" style="font-size:.74rem">━━ target ${num(goals.kcal)}</span>
            <span class="dim" style="font-size:.74rem">${a.onTargetDays} on target</span>
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Weekly average</h3><span class="chip num">${num(weekAverage())} kcal</span></div>
          ${lineChart(weeklyAverages(8), {
            height: 130, label: 'Weekly average calories', color: VIZ[1],
            fmt: v => `${num(v)} kcal`,
          })}
          <p class="dim" style="font-size:.75rem;margin-top:10px">
            One heavy Saturday does not undo a week. The weekly mean is the number
            your bodyweight actually responds to.</p>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Protein</h3>
            <span class="chip num ${proteinHitRate() >= 0.7 ? 'chip-ok' : 'chip-warn'}">${Math.round(proteinHitRate() * 100)}% of days</span></div>
          ${barChart(store.macroSeries(14).map(x => ({ date: x.date, value: Math.round(x.p) })), {
            height: 120, label: 'Daily protein', target: goals.protein, fmt: v => `${v} g`,
          })}
          <p class="dim" style="font-size:.75rem;margin-top:10px">
            Days at or above ${goals.protein} g, over the last 14. This is the macro
            worth chasing — the other two mostly sort themselves out.</p>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Quick add</h3></div>
          <div class="stack" style="gap:6px">
            ${frequentFoods().map(f => `
              <button class="list-item" style="cursor:pointer;text-align:left;width:100%" data-quick="${esc(f.id)}">
                <div class="grow" style="min-width:0">
                  <strong>${esc(f.name)}</strong><br><small>${f.kcal} kcal per ${esc(f.per)}${f.custom ? ' · yours' : ''}</small>
                </div>
                <span style="color:var(--ember);width:18px">${icon('plus')}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head">
            <h3>Your foods</h3>
            <button class="btn btn-ghost btn-sm" id="newFood">${icon('plus')}<span>New</span></button>
          </div>
          ${d.customFoods.length ? `<div class="list">${d.customFoods.map(f => `
            <div class="list-item">
              <div class="grow" style="min-width:0">
                <strong>${esc(f.name)}</strong><br>
                <small>${f.kcal} kcal per ${esc(f.per)} · P ${f.p} / C ${f.c} / F ${f.f}</small>
              </div>
              <button class="btn btn-ghost btn-sm" data-rmfood="${esc(f.id)}"
                aria-label="Delete ${esc(f.name)}">${icon('trash')}</button>
            </div>`).join('')}</div>`
            : `<p class="dim" style="font-size:.85rem">
                 Nothing in the database matching what you eat? Add it once and it is in
                 the picker and the quick-add list from then on.</p>`}
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Targets</h3><a class="card-link" href="profile.html">Edit →</a></div>
          <div class="stack" style="gap:7px;font-size:.86rem">
            ${[['Calories', `${num(goals.kcal)} kcal`], ['Protein', `${goals.protein} g`],
               ['Carbs', `${goals.carbs} g`], ['Fat', `${goals.fat} g`]]
              .map(([k, v]) => `<div class="row-between"><span class="muted">${k}</span><span class="num">${v}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </section>`;

  el.querySelector('#dayPick').addEventListener('change', e => { day = e.target.value; render(el); });
  el.querySelector('#prev').addEventListener('click', () => { day = shift(day, -1); render(el); });
  el.querySelector('#next').addEventListener('click', () => { day = shift(day, 1); render(el); });
  el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addFoodFlow(b.dataset.add)));
  el.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => quickAdd(b.dataset.quick)));
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editServings(b.dataset.edit)));
  el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
    await store.removeMeal(b.dataset.rm);
    toast('Removed');
  }));

  el.querySelectorAll('[data-water]').forEach(b => b.addEventListener('click', async () => {
    await store.logWater(+b.dataset.water, day);
    render(el);
  }));

  el.querySelector('#newFood').addEventListener('click', newFoodFlow);

  el.querySelectorAll('[data-logsaved]').forEach(b => b.addEventListener('click', () =>
    logSaved(store.data.savedMeals.find(m => m.id === b.dataset.logsaved))));
  el.querySelectorAll('[data-rmsaved]').forEach(b => b.addEventListener('click', async () => {
    await store.removeSavedMeal(b.dataset.rmsaved);
    toast('Removed');
  }));

  el.querySelector('#nudgeSave')?.addEventListener('click', () => saveSuggested());
  el.querySelector('#nudgeNo')?.addEventListener('click', async () => {
    await store.dismissMealPattern(el.querySelector('#nudgeNo').dataset.key);
  });
  el.querySelectorAll('[data-rmfood]').forEach(b => b.addEventListener('click', async () => {
    const f = byId(store.data.customFoods, b.dataset.rmfood);
    if (await confirmDialog('Delete this food?',
      `"${f?.name}" goes from your picker. Meals you already logged with it keep their numbers.`)) {
      await store.removeCustomFood(b.dataset.rmfood);
      toast('Deleted');
    }
  }));

  el.querySelector('#useMeasuredKcal')?.addEventListener('click', async () => {
    const t = plan;
    const kcal = Math.round(t.maintenance.kcal * (1 + (t.season?.kcalShift ?? 0)));
    const fat = Math.round((kcal * 0.25) / 9);
    await store.updateProfile({
      goals: {
        ...goals, kcal, fat,
        carbs: Math.max(0, Math.round((kcal - goals.protein * 4 - fat * 9) / 4)),
      },
    });
    toast(`Target now ${num(kcal)} kcal`, 'ok');
  });
}

/* --------------------------------------------------------------- the plan */

/**
 * How the target was arrived at, and whether the log agrees with it.
 *
 * The diet tab is where someone looks when the scale is not moving, so this is
 * the card that has to answer "why am I eating this number" honestly —
 * including admitting when there is not yet enough data to know.
 */
function targetCard(plan, a, goals) {
  const { maintenance, season } = plan;
  const measured = maintenance.confidence !== 'none';
  const wouldBe = Math.round(maintenance.kcal * (1 + (season?.kcalShift ?? 0)));
  const drift = wouldBe - goals.kcal;

  return `<div class="card card-pad-lg glow-edge" style="--glow-color:${esc(season?.accent ?? 'var(--ember)')}">
    <div class="card-head">
      <h3>Why ${num(goals.kcal)} kcal</h3>
      <span class="chip" style="--season:${esc(season?.accent ?? 'var(--ember)')}">${esc(season?.name ?? 'No season')}</span>
    </div>
    <div class="stack" style="gap:8px;font-size:.86rem">
      <div class="row-between"><span class="muted">Predicted maintenance</span>
        <span class="num">${num(plan.predicted)}</span></div>
      <div class="row-between"><span class="muted">Measured from your log</span>
        <span class="num ${measured ? '' : 'dim'}">${measured ? num(maintenance.kcal) : 'not yet'}</span></div>
      <div class="row-between"><span class="muted">${esc(season?.name ?? 'Season')} shift</span>
        <span class="num">${season?.kcalShift ? `${season.kcalShift > 0 ? '+' : ''}${Math.round(season.kcalShift * 100)}%` : 'none'}</span></div>
      <div class="row-between" style="padding-top:8px;border-top:1px solid var(--line)">
        <span class="muted">Adherence, 28 days</span>
        <span class="num ${a.score >= 0.6 ? '' : 'dim'}">${Math.round(a.score * 100)}%</span></div>
    </div>

    ${measured && Math.abs(drift) >= 75 ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
        <p class="muted" style="font-size:.84rem">
          Your own numbers put this season's target nearer ${num(wouldBe)} kcal
          (${drift > 0 ? '+' : ''}${num(drift)}).</p>
        <button class="btn btn-sm btn-block btn-primary" id="useMeasuredKcal" style="margin-top:12px">
          ${icon('check')}<span>Use ${num(wouldBe)} kcal</span></button>
      </div>`
      : `<p class="dim" style="font-size:.75rem;margin-top:12px">
          ${measured
            ? 'Your target matches what your data implies. Nothing to change.'
            : 'Log food on most days for a couple of weeks and FEROX will measure your maintenance instead of predicting it.'}</p>`}
  </div>`;
}

/**
 * The suggestion FEROX raises on its own.
 *
 * It only appears once the same combination has been logged twice, which is
 * the whole design: being asked to name your breakfast the first time you eat
 * it is an interruption, and being asked the second time is a shortcut.
 */
function mealNudge() {
  const pat = store.suggestibleMeal();
  if (!pat) return '';
  const all = [...store.data.customFoods, ...FOODS];
  const names = pat.items.map(i => all.find(f => f.id === i.foodId)?.name).filter(Boolean);
  if (names.length < 2) return '';

  return `<div class="nudge">
    ${icon('sparkle')}
    <div class="nudge-body">
      <strong>You have had this ${pat.count} times</strong>
      <p>${esc(names.join(' + '))}</p>
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn btn-sm btn-primary" id="nudgeSave">Save as a meal</button>
        <button class="btn btn-sm btn-ghost" id="nudgeNo" data-key="${esc(pat.key)}">No thanks</button>
      </div>
    </div>
  </div>`;
}

/** One-tap repeats, most used first. */
function savedMealsCard() {
  const saved = store.data.savedMeals;
  if (!saved.length) return '';
  return `<div class="card card-pad-lg">
    <div class="card-head"><h3>Your meals</h3><span class="chip num">${saved.length}</span></div>
    <div class="list">
      ${saved.slice(0, 8).map(m => `
        <div class="list-item">
          <button class="grow" data-logsaved="${esc(m.id)}"
            style="min-width:0;text-align:left;background:none;border:0;cursor:pointer;color:inherit">
            <strong>${esc(m.name)}</strong><br>
            <small>${num(m.kcal)} kcal · P ${m.p} / C ${m.c} / F ${m.f}${m.uses ? ` · used ${m.uses}×` : ''}</small>
          </button>
          <button class="btn btn-ghost btn-sm" data-rmsaved="${esc(m.id)}"
            aria-label="Delete ${esc(m.name)}">${icon('trash')}</button>
        </div>`).join('')}
    </div>
    <p class="dim" style="font-size:var(--step--2);margin-top:10px">Tap one to log it again.</p>
  </div>`;
}

/** Turn the suggested pattern into a named, saved meal. */
async function saveSuggested() {
  const pat = store.suggestibleMeal();
  if (!pat) return;
  const all = [...store.data.customFoods, ...FOODS];
  const items = pat.items.map(i => ({ food: all.find(f => f.id === i.foodId), qty: i.qty }))
    .filter(x => x.food);
  const guess = items.map(x => x.food.name.split(',')[0]).slice(0, 2).join(' and ');

  const res = await modal({
    title: 'Save this meal',
    submit: 'Save it',
    body: `
      <div class="field">
        <label for="smName">Call it</label>
        <input class="input" id="smName" name="name" maxlength="60" value="${esc(guess)}" required>
      </div>
      <p class="dim" style="font-size:var(--step--2)">
        ${esc(items.map(x => `${x.qty}× ${x.food.name}`).join(', '))}</p>`,
  });
  if (!res) return;

  await store.saveMeal({
    name: res.name.trim() || guess,
    meal: pat.meal,
    items: pat.items,
    ...totals(items),
  });
  toast('Saved — one tap next time', 'ok');
}

/* --------------------------------------------------------------- helpers */

/** 35 ml per kg, plus half a litre if a session was logged today. */
function waterTarget(profile) {
  const base = (profile.weightKg || 75) * 35;
  const trained = store.data.sessions.some(s => s.date === day);
  return Math.round(((base + (trained ? 500 : 0)) / GLASS_ML)) * GLASS_ML;
}

/** Mean calories across the days of the last week that had anything logged. */
function weekAverage() {
  const days = store.kcalSeries(7).filter(x => x.value > 0);
  return days.length ? days.reduce((t, x) => t + x.value, 0) / days.length : 0;
}

/** One point per week, so a noisy daily line becomes a readable trend. */
function weeklyAverages(weeks = 8) {
  const series = store.kcalSeries(weeks * 7);
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const chunk = series.slice(w * 7, w * 7 + 7).filter(x => x.value > 0);
    if (!chunk.length) continue;
    out.push({
      date: series[w * 7].date,
      value: Math.round(chunk.reduce((t, x) => t + x.value, 0) / chunk.length),
    });
  }
  return out;
}

/** Share of the last 14 logged days that reached the protein target. */
function proteinHitRate() {
  const target = store.data.profile.goals.protein;
  const days = store.macroSeries(14).filter(x => x.kcal > 0);
  if (!days.length) return 0;
  return days.filter(x => x.p >= target * 0.95).length / days.length;
}

/** Calories by food over the window — where the day actually goes. */
function topFoods(days = 30) {
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const tally = new Map();
  for (const m of store.data.meals) {
    if (m.date < from) continue;
    tally.set(m.name, (tally.get(m.name) ?? 0) + m.kcal);
  }
  return [...tally.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function macro(label, value, target, color) {
  const p = pct(value, target);
  return `<div>
    <div class="row-between" style="margin-bottom:5px">
      <span class="row" style="gap:7px;font-size:.85rem;font-weight:600">
        <i style="width:9px;height:9px;border-radius:2px;background:${color};display:block"></i>${esc(label)}
      </span>
      <span class="dim num" style="font-size:.79rem">${Math.round(value)} / ${target} g · ${p}%</span>
    </div>
    <div class="bar"><i style="width:${Math.min(100, p)}%;background:${color}"></i></div>
  </div>`;
}

/** Foods you've logged most, falling back to the top of the database. */
function frequentFoods() {
  const all = catalogue();
  const tally = new Map();
  for (const m of store.data.meals) if (m.foodId) tally.set(m.foodId, (tally.get(m.foodId) ?? 0) + 1);
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => byId(all, id)).filter(Boolean);
  return [...ranked, ...all.filter(f => !tally.has(f.id))].slice(0, 6);
}

/* ----------------------------------------------------------------- flows */

async function quickAdd(foodId) {
  const food = findFood(foodId);
  if (!food) return;
  await logFood(food, 1, mealForNow());
  toast(`${food.name} added to ${mealForNow().toLowerCase()}`, 'ok');
}

/** Which meal a quick-add lands in, from the clock. */
function mealForNow() {
  const hour = new Date().getHours();
  return hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 21 ? 'Dinner' : 'Snack';
}

async function logFood(food, qty, meal) {
  await store.addMeal({
    date: day, meal, foodId: food.id, name: food.name, qty,
    kcal: Math.round(food.kcal * qty),
    p: +(food.p * qty).toFixed(1), c: +(food.c * qty).toFixed(1), f: +(food.f * qty).toFixed(1),
  });
}

/**
 * Add food, with a live search across the catalogue.
 *
 * The old version was a single `<select>` of every food, which is fine at
 * twenty entries and unusable the moment someone adds their own. The list
 * filters as you type and the macros for the chosen serving update with it,
 * so the number being logged is visible before it is committed.
 */
/**
 * Log a plate of several foods in one go, remembering what it was.
 *
 * Every combination logged together is fingerprinted and counted by the store.
 * Nothing is saved and nothing is asked the first time — see
 * `store.noteMealPattern`.
 */
async function logPlate({ items, name, meal }) {
  for (const it of items) await logFood(it.food, it.qty, meal);
  await store.noteMealPattern(items.map(i => ({ foodId: i.food.id, qty: i.qty })), meal);

  if (name) {
    const t = totals(items);
    await store.saveMeal({
      name, meal,
      items: items.map(i => ({ foodId: i.food.id, qty: i.qty })),
      ...t,
    });
    toast(`${name} logged and saved`, 'ok');
  } else {
    toast(`${items.length} item${items.length === 1 ? '' : 's'} logged`, 'ok');
  }
}

/** Log a saved meal in one tap. */
async function logSaved(saved) {
  const all = [...store.data.customFoods, ...FOODS];
  for (const it of saved.items) {
    const food = all.find(f => f.id === it.foodId);
    if (food) await logFood(food, it.qty, saved.meal ?? mealForNow());
  }
  await store.noteMealUsed(saved.id);
  toast(`${saved.name} logged`, 'ok');
}

async function addFoodFlow(meal = mealForNow()) {
  pickFood({
    title: `Add to ${meal.toLowerCase()}`,
    onPick: async (food, qty) => {
      await logFood(food, qty, meal);
      toast(`${food.name} logged`, 'ok');
    },
  });
}

/**
 * Add a food of your own.
 *
 * Calories are derived from the macros rather than typed, because the two
 * disagreeing is the single most common way a food database goes wrong — and
 * a packet label rounds, so the arithmetic is more trustworthy than the number
 * printed on it.
 */
async function newFoodFlow() {
  const res = await modal({
    title: 'New food',
    submit: 'Save food',
    body: `
      <div class="field">
        <label for="nfName">Name</label>
        <input class="input" id="nfName" name="name" required maxlength="60" placeholder="Mum's lasagne">
      </div>
      <div class="field">
        <label for="nfPer">Serving</label>
        <input class="input" id="nfPer" name="per" value="100 g" maxlength="24"
          placeholder="100 g, 1 slice, 1 bowl">
      </div>
      <div class="field-row">
        <div class="field"><label for="nfP">Protein (g)</label>
          <input class="input" id="nfP" name="p" type="number" min="0" max="200" step="0.1" value="0" inputmode="decimal"></div>
        <div class="field"><label for="nfC">Carbs (g)</label>
          <input class="input" id="nfC" name="c" type="number" min="0" max="300" step="0.1" value="0" inputmode="decimal"></div>
      </div>
      <div class="field">
        <label for="nfF">Fat (g)</label>
        <input class="input" id="nfF" name="f" type="number" min="0" max="200" step="0.1" value="0" inputmode="decimal">
      </div>
      <p class="dim" style="font-size:.78rem">
        Calories are worked out from the macros — 4 per gram of protein and carbs, 9 per gram
        of fat — so the two can never drift apart.</p>`,
  });
  if (!res) return null;

  const p = +res.p || 0, c = +res.c || 0, f = +res.f || 0;
  const kcal = Math.round(p * 4 + c * 4 + f * 9);
  if (!kcal) { toast('A food needs at least one macro', 'bad'); return null; }

  const made = await store.addCustomFood({
    name: res.name.trim() || 'Custom food',
    per: res.per.trim() || '1 serving',
    kcal, p, c, f,
  });
  toast(`${made.name} added — ${kcal} kcal per ${made.per}`, 'ok');
  return made;
}

/** Change the servings on something already logged, without deleting it. */
async function editServings(id) {
  const entry = store.data.meals.find(m => m.id === id);
  if (!entry) return;
  const perServing = entry.qty ? entry.kcal / entry.qty : entry.kcal;

  const res = await modal({
    title: entry.name,
    submit: 'Update',
    body: `
      <div class="field">
        <label for="esQty">Servings</label>
        <input class="input" id="esQty" name="qty" type="number" min="0.25" step="0.25"
          value="${entry.qty}" inputmode="decimal">
      </div>
      <p class="dim" style="font-size:.8rem">${Math.round(perServing)} kcal per serving.</p>`,
  });
  if (!res) return;

  const q = Math.max(0.25, +res.qty || 1);
  const ratio = q / (entry.qty || 1);
  await store.commit(d => {
    const m = d.meals.find(x => x.id === id);
    if (!m) return;
    m.kcal = Math.round(m.kcal * ratio);
    m.p = +(m.p * ratio).toFixed(1);
    m.c = +(m.c * ratio).toFixed(1);
    m.f = +(m.f * ratio).toFixed(1);
    m.qty = q;
  });
  toast('Updated', 'ok');
}
