/**
 * The exercise catalog: a search box, some filters, and a detail view.
 *
 * Shared by the Workouts page (browsing) and the session logger (picking), so
 * the two cannot drift into two different ideas of how you find a movement.
 *
 * The list is capped and paged rather than rendered whole. A thousand rows of
 * markup is a second of layout on a phone, and nobody scrolls past fifty.
 */
import { esc } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { searchExercises, relatedTo, GEAR_FILTERS, MECHANIC_FILTERS, GROUPS } from '../core/catalog.js';
import { muscleMap, muscleChip, muscleLegend } from '../core/musclemap.js';
import { exerciseById } from '../core/seed.js';
import { predicted1RM, standardFor } from '../core/strength.js';

const PAGE = 40;

/** What a movement is for, in one line, composed from what we know about it. */
export function describe(ex) {
  const kit = {
    barbell: 'a barbell', dumbbell: 'dumbbells', machine: 'a machine', cable: 'a cable stack',
    kettlebell: 'a kettlebell', band: 'a band', bodyweight: 'your bodyweight',
    plyo: 'your bodyweight, explosively', cardio: 'a cardio machine', other: 'equipment',
  }[ex.gear] ?? 'equipment';

  const shape = ex.mechanic === 'compound'
    ? 'A compound movement — several joints working together, which is why it carries the heaviest loads.'
    : 'An isolation movement — one joint, one job, and the way to bring a lagging muscle up.';

  const effort = { push: 'a pushing', pull: 'a pulling', static: 'a holding' }[ex.force] ?? 'a';

  return `${shape} It is ${effort} exercise using ${kit}.`;
}

/** The bits of an exercise a person actually wants at a glance. */
export function exerciseChips(ex) {
  return [
    ['gear', ex.gear],
    ['mech', ex.mechanic],
    ['pattern', ex.pattern],
    ex.stress.length ? ['loads', ex.stress.join(', ')] : null,
  ].filter(Boolean)
    .map(([k, v]) => `<span class="chip" title="${esc(k)}">${esc(v)}</span>`).join('');
}

/**
 * The full-screen detail for one exercise.
 * @param {object} ex
 * @param {{profile?:object, onPick?:function}} opts
 */
export function exerciseDetail(ex, { profile = null, onPick = null } = {}) {
  const est = profile && standardFor(ex) ? predicted1RM(ex.id, profile) : null;
  const siblings = relatedTo(ex, 10);

  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(640px, calc(100vw - 24px))';
  dlg.innerHTML = `
    <div class="card card-pad-lg stack" style="gap:16px">
      <div class="row-between" style="align-items:flex-start">
        <div style="min-width:0">
          <p class="eyebrow">${esc(ex.muscle)}</p>
          <h3 style="font-size:var(--step-2);margin-top:4px">${esc(ex.name)}</h3>
        </div>
        <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>

      ${muscleMap(ex, { size: 128 })}

      <p class="muted" style="font-size:var(--step--1)">${esc(describe(ex))}</p>

      <div class="row wrap" style="gap:7px">${exerciseChips(ex)}</div>

      ${est ? `<div class="row-between" style="padding-top:12px;border-top:1px solid var(--line)">
        <span class="muted" style="font-size:var(--step--1)">Estimated one-rep max for you</span>
        <span class="num" style="font-size:var(--step--1)">${fmtWeight(est, store.unit, { decimals: 0 })}</span>
      </div>
      <p class="dim" style="font-size:var(--step--2);margin-top:-8px">
        From your bodyweight, age and stated experience — before you have lifted it. FEROX opens
        you well under this and works up from what you actually log.</p>` : ''}

      ${siblings.length ? `<div>
        <p class="eyebrow" style="margin-bottom:8px">Variations</p>
        <div class="row wrap" style="gap:6px">
          ${siblings.map(s => `<button class="chip" data-goto="${esc(s.id)}"
            style="cursor:pointer">${esc(s.name)}</button>`).join('')}
        </div>
      </div>` : ''}

      ${onPick ? `<button class="btn btn-primary btn-block" data-pick>${icon('plus')}<span>Add to session</span></button>` : ''}
    </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.querySelector('[data-pick]')?.addEventListener('click', () => { close(); onPick(ex); });
  dlg.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
    close();
    exerciseDetail(exerciseById(b.dataset.goto), { profile, onPick });
  }));

  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

/**
 * Mount a live catalog into `host`.
 *
 * @param {HTMLElement} host
 * @param {{profile?:object, onPick?:function, compact?:boolean,
 *          equipment?:string, limits?:string[]}} opts
 * @returns {{refresh:function}}
 */
export function mountCatalog(host, {
  profile = null, onPick = null, compact = false, equipment = null, limits = null,
} = {}) {
  const state = { q: '', group: 'All', gear: 'all', mechanic: 'all', shown: PAGE, mine: Boolean(equipment) };

  host.innerHTML = `
    <div class="stack" style="gap:12px">
      <div class="field">
        <label class="sr-only" for="catQ">Search exercises</label>
        <div class="search-wrap">
          ${icon('search')}
          <input class="input search-input" id="catQ" type="search" autocomplete="off"
            placeholder="Search 1,000 exercises — name, muscle or kit">
        </div>
      </div>

      <div class="seg" role="group" aria-label="Muscle group" id="catGroups">
        ${['All', ...GROUPS].map(g =>
          `<button data-group="${esc(g)}" aria-pressed="${g === 'All'}">${esc(g)}</button>`).join('')}
      </div>

      <div class="seg" role="group" aria-label="Equipment" id="catGear">
        ${GEAR_FILTERS.map(f =>
          `<button data-gear="${esc(f.id)}" aria-pressed="${f.id === 'all'}">${esc(f.label)}</button>`).join('')}
      </div>

      <div class="row-between wrap" style="gap:10px">
        <div class="seg" role="group" aria-label="Type" id="catMech">
          ${MECHANIC_FILTERS.map(f =>
            `<button data-mech="${esc(f.id)}" aria-pressed="${f.id === 'all'}">${esc(f.label)}</button>`).join('')}
        </div>
        ${equipment ? `<label class="row" style="gap:7px;font-size:var(--step--2);cursor:pointer">
          <input type="checkbox" id="catMine" checked> Only what I can do
        </label>` : ''}
      </div>

      <p class="dim" id="catCount" style="font-size:var(--step--2)"></p>
      <div class="cat-list" id="catRows"></div>
      <button class="btn btn-sm btn-block" id="catMore" hidden>Show more</button>
    </div>`;

  const rows = host.querySelector('#catRows');
  const count = host.querySelector('#catCount');
  const more = host.querySelector('#catMore');

  function draw() {
    const { rows: hits, total } = searchExercises({
      q: state.q, group: state.group, gear: state.gear, mechanic: state.mechanic,
      equipment: state.mine ? equipment : null,
      limits: state.mine ? limits : null,
      limit: state.shown,
    });

    count.textContent = total
      ? `${total.toLocaleString()} exercise${total === 1 ? '' : 's'}${total > hits.length ? ` · showing ${hits.length}` : ''}`
      : 'Nothing matches that.';

    rows.innerHTML = hits.map(e => `
      <button class="cat-row" data-ex="${esc(e.id)}">
        ${muscleChip(e, compact ? 28 : 34)}
        <span class="cat-row-main">
          <strong>${esc(e.name)}</strong>
          <small>${esc(e.muscle)} · ${esc(e.gear)} · ${esc(e.mechanic)}</small>
        </span>
        ${onPick ? `<span class="cat-row-add" data-add="${esc(e.id)}">${icon('plus')}</span>` : icon('chevron')}
      </button>`).join('');

    more.hidden = total <= hits.length;
    rows.querySelectorAll('.cat-row').forEach(b => b.addEventListener('click', ev => {
      const ex = exerciseById(b.dataset.ex);
      // The + adds it straight away; the row itself opens the detail, because
      // "what does this even work" is the question a thousand exercises create.
      if (onPick && ev.target.closest('[data-add]')) onPick(ex);
      else exerciseDetail(ex, { profile, onPick });
    }));
  }

  // Debounced, because redrawing forty rows on every keystroke of a fast typist
  // is work thrown away before anyone sees it.
  let timer;
  host.querySelector('#catQ').addEventListener('input', e => {
    state.q = e.target.value;
    state.shown = PAGE;
    clearTimeout(timer);
    timer = setTimeout(draw, 120);
  });

  const seg = (sel, key, attr) => host.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => {
    state[key] = b.dataset[attr];
    state.shown = PAGE;
    host.querySelectorAll(sel).forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  }));
  seg('[data-group]', 'group', 'group');
  seg('[data-gear]', 'gear', 'gear');
  seg('[data-mech]', 'mechanic', 'mech');

  host.querySelector('#catMine')?.addEventListener('change', e => {
    state.mine = e.target.checked;
    state.shown = PAGE;
    draw();
  });
  more.addEventListener('click', () => { state.shown += PAGE; draw(); });

  draw();
  return { refresh: draw, focus: () => host.querySelector('#catQ').focus() };
}

export { muscleMap, muscleLegend };
