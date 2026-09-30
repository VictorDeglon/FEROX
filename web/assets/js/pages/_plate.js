/**
 * Finding food, and building a plate out of it.
 *
 * Three ways in, because people arrive knowing different amounts:
 *
 *   search      you know what it is called
 *   the plate   you know what is on the plate but not what to call the whole
 *               thing — add the parts, and it adds up
 *   a photo     you know none of the above
 *
 * The photo path is the honest one to read the comments on: FEROX runs with no
 * backend and no network by default, and food recognition cannot happen in
 * plain JavaScript on a phone without shipping a model far larger than the
 * whole app. So it is an *optional* path, off unless configured, and it says
 * plainly that any number it returns is an estimate. See `estimateFromPhoto`.
 */
import { esc, toast, modal, num } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { FOODS, FOOD_CATEGORIES, MEALS, per100 } from '../core/seed.js';

const PAGE = 30;

/** Everything searchable: the database plus anything this athlete added. */
export const catalogue = () => [...store.data.customFoods, ...FOODS];

/*
 * Prebuilt lowercase haystack, same reason as the exercise catalog: doing this
 * per keystroke over four hundred rows is work thrown away before anyone sees
 * it. Rebuilt whenever a custom food is added, which is rare.
 */
let HAY = new Map();
let HAY_FOR = null;
function haystack() {
  const list = catalogue();
  if (HAY_FOR !== list.length) {
    HAY = new Map(list.map(f => [f.id, `${f.name} ${f.category ?? ''}`.toLowerCase()]));
    HAY_FOR = list.length;
  }
  return HAY;
}

/** Search the food database. Custom foods rank first — they are yours. */
export function searchFoods({ q = '', category = 'All', limit = PAGE } = {}) {
  const hay = haystack();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];

  for (const f of catalogue()) {
    if (category !== 'All' && f.category !== category) continue;
    const h = hay.get(f.id) ?? f.name.toLowerCase();
    let s = 0;
    let ok = true;
    for (const w of words) {
      if (!h.includes(w)) { ok = false; break; }
      s += f.name.toLowerCase().startsWith(w) ? 100 : h.includes(` ${w}`) ? 60 : 30;
    }
    if (!ok) continue;
    if (f.custom) s += 50;
    hits.push({ f, s: s - f.name.length / 100 });
  }

  hits.sort((a, b) => (words.length ? b.s - a.s : 0) || a.f.name.localeCompare(b.f.name));
  return { rows: hits.slice(0, limit).map(h => h.f), total: hits.length };
}

/** Scale a food's macros to `qty` servings. */
export const scale = (food, qty) => ({
  kcal: Math.round(food.kcal * qty),
  p: +(food.p * qty).toFixed(1),
  c: +(food.c * qty).toFixed(1),
  f: +(food.f * qty).toFixed(1),
});

/** Add up a plate. */
export function totals(items) {
  return items.reduce((t, it) => {
    const s = scale(it.food, it.qty);
    return { kcal: t.kcal + s.kcal, p: +(t.p + s.p).toFixed(1),
             c: +(t.c + s.c).toFixed(1), f: +(t.f + s.f).toFixed(1) };
  }, { kcal: 0, p: 0, c: 0, f: 0 });
}

/* ------------------------------------------------------------- the picker */

/**
 * The food search, as a dialog. Calls `onPick(food, qty)` per selection and
 * stays open, so building a plate is a few taps rather than a few round trips.
 */
export function pickFood({ onPick, title = 'Add food', footer = '' } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(620px, calc(100vw - 24px))';
  dlg.innerHTML = `
    <div class="card card-pad-lg stack" style="gap:13px">
      <div class="row-between">
        <h3>${esc(title)}</h3>
        <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="search-wrap">
        ${icon('search')}
        <input class="input search-input" id="foodQ" type="search" autocomplete="off"
          placeholder="Search ${catalogue().length} foods">
      </div>
      <div class="seg" role="group" aria-label="Category">
        ${['All', ...FOOD_CATEGORIES].map(c =>
          `<button data-cat="${esc(c)}" aria-pressed="${c === 'All'}">${esc(c)}</button>`).join('')}
      </div>
      <p class="dim" id="foodCount" style="font-size:var(--step--2)"></p>
      <div class="cat-list" id="foodRows"></div>
      <button class="btn btn-sm btn-block" id="foodMore" hidden>Show more</button>
      ${footer}
      <button class="btn btn-ghost btn-block" data-close>Done</button>
    </div>`;

  const state = { q: '', category: 'All', shown: PAGE };
  const rows = dlg.querySelector('#foodRows');
  const count = dlg.querySelector('#foodCount');
  const more = dlg.querySelector('#foodMore');

  function draw() {
    const { rows: hits, total } = searchFoods({ ...state, limit: state.shown });
    count.textContent = total
      ? `${total} food${total === 1 ? '' : 's'}${total > hits.length ? ` · showing ${hits.length}` : ''}`
      : 'Nothing matches. Add it as your own below.';
    rows.innerHTML = hits.map(f => `
      <button class="cat-row" data-food="${esc(f.id)}">
        <span class="cat-row-main">
          <strong>${esc(f.name)}${f.custom ? ' <span class="chip">yours</span>' : ''}</strong>
          <small>${f.kcal} kcal per ${esc(f.per)} · P ${f.p} / C ${f.c} / F ${f.f}</small>
        </span>
        <span class="cat-row-add">${icon('plus')}</span>
      </button>`).join('');
    more.hidden = total <= hits.length;

    rows.querySelectorAll('[data-food]').forEach(b => b.addEventListener('click', async () => {
      const food = catalogue().find(f => f.id === b.dataset.food);
      const qty = await askQuantity(food);
      if (qty) onPick(food, qty);
    }));
  }

  let timer;
  dlg.querySelector('#foodQ').addEventListener('input', e => {
    state.q = e.target.value; state.shown = PAGE;
    clearTimeout(timer);
    timer = setTimeout(draw, 110);
  });
  dlg.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    state.category = b.dataset.cat; state.shown = PAGE;
    dlg.querySelectorAll('[data-cat]').forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  }));
  more.addEventListener('click', () => { state.shown += PAGE; draw(); });

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  document.body.append(dlg);
  draw();
  dlg.showModal();
  dlg.querySelector('#foodQ').focus();
  return { close, refresh: draw, dialog: dlg };
}

/**
 * How much of it.
 *
 * Servings *and* grams, live-linked, because people think in both and which
 * one depends entirely on the food: nobody weighs a banana and nobody counts
 * servings of rice.
 */
export async function askQuantity(food) {
  const res = await modal({
    title: food.name,
    submit: 'Add',
    body: `
      <div class="field-row">
        <div class="field">
          <label for="qServ">Servings</label>
          <input class="input" id="qServ" name="qty" type="number" min="0.25" step="0.25"
            value="1" inputmode="decimal">
          <p class="dim" style="font-size:var(--step--2)">1 serving = ${esc(food.per)}</p>
        </div>
        <div class="field">
          <label for="qG">Grams</label>
          <input class="input" id="qG" type="number" min="1" step="1" value="${food.grams ?? 100}"
            inputmode="numeric" ${food.grams ? '' : 'disabled'}>
          <p class="dim" style="font-size:var(--step--2)">${food.grams ? 'Or weigh it' : 'Unknown weight'}</p>
        </div>
      </div>
      <p class="muted" id="qPreview" style="font-size:var(--step--1)"></p>`,
    onMount: dlg => {
      const serv = dlg.querySelector('#qServ');
      const grams = dlg.querySelector('#qG');
      const preview = dlg.querySelector('#qPreview');
      const sync = from => {
        const qty = from === 'g' && food.grams
          ? (+grams.value || 0) / food.grams
          : Math.max(0, +serv.value || 0);
        if (from === 'g') serv.value = Math.round(qty * 100) / 100;
        else if (food.grams) grams.value = Math.round(qty * food.grams);
        const s = scale(food, qty);
        preview.textContent = `${s.kcal} kcal · P ${s.p} / C ${s.c} / F ${s.f}`;
      };
      serv.addEventListener('input', () => sync('serv'));
      grams.addEventListener('input', () => sync('g'));
      sync('serv');
    },
  });
  return res ? Math.max(0.05, +res.qty || 1) : null;
}

/* -------------------------------------------------------------- the plate */

/**
 * Build a meal from its parts.
 *
 * This is the "stats on a box" path, and it is the one that always works: add
 * what was on the plate, watch the numbers add up, name it and keep it.
 */
export function plateBuilder({ meal = 'Dinner', onDone } = {}) {
  let items = [];

  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(620px, calc(100vw - 24px))';
  dlg.innerHTML = `
    <form class="card card-pad-lg stack" style="gap:14px">
      <div class="row-between">
        <div>
          <p class="eyebrow" style="color:var(--ember)">Build a meal</p>
          <h3 style="font-size:var(--step-2);margin-top:4px">What was on the plate?</h3>
        </div>
        <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>

      <div id="plateItems" class="stack" style="gap:7px"></div>
      <button type="button" class="btn btn-sm" id="plateAdd">${icon('plus')}<span>Add an ingredient</span></button>

      <div class="plate-total" id="plateTotal"></div>

      <div class="field-row">
        <div class="field">
          <label for="plateName">Name it (optional)</label>
          <input class="input" id="plateName" name="name" maxlength="60" placeholder="Post-gym bowl">
        </div>
        <div class="field">
          <label for="plateMeal">Meal</label>
          <select class="select" id="plateMeal" name="meal">
            ${MEALS.map(m => `<option${m === meal ? ' selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="dim" style="font-size:var(--step--2);margin-top:-6px">
        Name it and it is one tap next time. Leave it blank and it still logs — FEROX will
        offer to save it if you build the same thing again.</p>

      <div class="row" style="justify-content:flex-end;gap:10px">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${icon('check')}<span>Log it</span></button>
      </div>
    </form>`;

  const host = dlg.querySelector('#plateItems');
  const totalEl = dlg.querySelector('#plateTotal');

  function draw() {
    host.innerHTML = items.length ? items.map((it, i) => `
      <div class="list-item">
        <div class="grow" style="min-width:0">
          <strong>${esc(it.food.name)}</strong><br>
          <small>${it.qty}× ${esc(it.food.per)} · ${scale(it.food, it.qty).kcal} kcal</small>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-rm="${i}" aria-label="Remove">${icon('trash')}</button>
      </div>`).join('')
      : `<p class="dim" style="font-size:var(--step--1)">Nothing yet. Add what was on the plate and it adds up as you go.</p>`;

    const t = totals(items);
    totalEl.innerHTML = `
      <div class="row-between">
        <span class="eyebrow">Total</span>
        <strong class="num" style="font-size:var(--step-1)">${num(t.kcal)} kcal</strong>
      </div>
      <div class="row wrap" style="gap:12px;margin-top:6px">
        <span class="dim num" style="font-size:var(--step--2)">P ${t.p} g</span>
        <span class="dim num" style="font-size:var(--step--2)">C ${t.c} g</span>
        <span class="dim num" style="font-size:var(--step--2)">F ${t.f} g</span>
      </div>`;

    host.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
      items.splice(+b.dataset.rm, 1); draw();
    }));
  }

  dlg.querySelector('#plateAdd').addEventListener('click', () => {
    pickFood({ onPick: (food, qty) => { items.push({ food, qty }); draw(); } });
  });

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  dlg.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    if (!items.length) { toast('Add at least one ingredient', 'bad'); return; }
    const f = Object.fromEntries(new FormData(e.target));
    close();
    onDone?.({ items, name: f.name?.trim() || '', meal: f.meal, totals: totals(items) });
  });

  document.body.append(dlg);
  draw();
  dlg.showModal();
}
