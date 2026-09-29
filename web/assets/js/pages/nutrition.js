/** Nutrition — the diet tracker: log food, watch macros against target. */
import { store, todayISO, daysAgoISO } from '../core/store.js';
import { bootPage, esc, num, pct, toast, modal, confirmDialog } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { ring, barChart, VIZ } from '../core/chart.js';
import { FOODS, MEALS, byId } from '../core/seed.js';

let day = todayISO();

const shift = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const out = d.toISOString().slice(0, 10);
  return out > todayISO() ? todayISO() : out;
};

const view = await bootPage({
  title: 'Nutrition',
  actions: `<button class="btn btn-primary btn-sm" id="addFood">${icon('plus')}<span>Add food</span></button>`,
}, render);

document.getElementById('addFood').addEventListener('click', () => addFoodFlow());

function render(el) {
  const goals = store.data.profile.goals;
  const m = store.macrosFor(day);
  const logged = store.data.meals.filter(x => x.date === day);
  const remaining = Math.max(0, goals.kcal - m.kcal);
  const over = m.kcal > goals.kcal;

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
                <button class="btn btn-ghost btn-sm" data-add="${esc(meal)}">${icon('plus')}</button>
              </div>
            </div>
            ${items.length ? `<div class="list">${items.map(x => `
              <div class="list-item">
                <div class="grow" style="min-width:0">
                  <strong>${esc(x.name)}</strong><br>
                  <small>${x.qty}× · ${num(x.kcal)} kcal · P ${x.p} / C ${x.c} / F ${x.f}</small>
                </div>
                <button class="btn btn-ghost btn-sm" data-rm="${x.id}" aria-label="Remove ${esc(x.name)}">${icon('trash')}</button>
              </div>`).join('')}</div>`
              : `<p class="dim" style="font-size:.85rem">Nothing logged.</p>`}
          </div>`;
        }).join('')}
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="card-head"><h3>Last 14 days</h3></div>
          ${barChart(store.kcalSeries(14), { height: 150, label: 'Daily calories', target: goals.kcal, fmt: v => `${num(v)} kcal` })}
          <div class="row" style="gap:14px;margin-top:12px">
            <span class="dim" style="font-size:.74rem">━━ target ${num(goals.kcal)}</span>
            <span class="dim" style="font-size:.74rem">${store.macroHitDays()} days on target</span>
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Quick add</h3></div>
          <div class="stack" style="gap:6px">
            ${frequentFoods().map(f => `
              <button class="list-item" style="cursor:pointer;text-align:left;width:100%" data-quick="${f.id}">
                <div class="grow" style="min-width:0">
                  <strong>${esc(f.name)}</strong><br><small>${f.kcal} kcal per ${esc(f.per)}</small>
                </div>
                <span style="color:var(--ember);width:18px">${icon('plus')}</span>
              </button>`).join('')}
          </div>
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
  el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
    await store.removeMeal(b.dataset.rm);
    toast('Removed');
  }));
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
  const tally = new Map();
  for (const m of store.data.meals) if (m.foodId) tally.set(m.foodId, (tally.get(m.foodId) ?? 0) + 1);
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => byId(FOODS, id)).filter(Boolean);
  return [...ranked, ...FOODS.filter(f => !tally.has(f.id))].slice(0, 5);
}

async function quickAdd(foodId) {
  const food = byId(FOODS, foodId);
  const hour = new Date().getHours();
  const meal = hour < 11 ? 'Breakfast' : hour < 15 ? 'Lunch' : hour < 21 ? 'Dinner' : 'Snack';
  await logFood(food, 1, meal);
  toast(`${food.name} added to ${meal.toLowerCase()}`, 'ok');
}

async function logFood(food, qty, meal) {
  await store.addMeal({
    date: day, meal, foodId: food.id, name: food.name, qty,
    kcal: Math.round(food.kcal * qty),
    p: +(food.p * qty).toFixed(1), c: +(food.c * qty).toFixed(1), f: +(food.f * qty).toFixed(1),
  });
}

async function addFoodFlow(meal = 'Breakfast') {
  const res = await modal({
    title: 'Add food',
    submit: 'Add',
    body: `
      <div class="field">
        <label for="foodId">Food</label>
        <select class="select" id="foodId" name="foodId">
          ${FOODS.map(f => `<option value="${f.id}">${esc(f.name)} — ${f.kcal} kcal / ${esc(f.per)}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="qty">Servings</label>
          <input class="input" id="qty" name="qty" type="number" min="0.25" step="0.25" value="1">
        </div>
        <div class="field">
          <label for="meal">Meal</label>
          <select class="select" id="meal" name="meal">
            ${MEALS.map(m => `<option${m === meal ? ' selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="dim" style="font-size:.78rem">Custom foods are on the roadmap — for now pick the closest match and tune the servings.</p>`,
  });
  if (!res) return;
  const food = byId(FOODS, res.foodId);
  const qty = Math.max(0.25, +res.qty || 1);
  await logFood(food, qty, res.meal);
  toast(`${food.name} logged`, 'ok');
}
