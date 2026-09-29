/** Seasons — the training year. Pick a layout, then what runs in each block. */
import { store } from '../core/store.js';
import { bootPage, esc, toast, confirmDialog } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { seasonIcon } from '../core/season-icons.js';
import {
  LAYOUTS, SEASONS, seasonById, slotById, slotsFor, recommendedFor, isYearRound,
  currentSlot, formatWindow, nextStart, nextEnd, daysBetween, slotProgress, defaultYear,
} from '../core/seasons.js';

const meta = (k, v) => `<div class="row-between" style="font-size:var(--step--1);gap:12px">
  <span class="dim">${esc(k)}</span><span style="text-align:right">${esc(v)}</span></div>`;

const stat = (label, value) => `<div class="stat">
  <span class="stat-label">${esc(label)}</span>
  <span style="font-size:var(--step--1);font-weight:600">${esc(value)}</span></div>`;

const NOW = new Date();
let filter = 'all';

await bootPage({ title: 'Seasons' }, render);

const layout = () => store.data.layout ?? 4;
const live = () => currentSlot(layout(), NOW);

function render(el) {
  const picks = store.data.seasons ?? {};
  const slots = slotsFor(layout());
  const cur = live();
  const livePick = picks[cur.id] ? seasonById(picks[cur.id]) : null;
  const filtered = filter === 'all' ? SEASONS : SEASONS.filter(s => s.kind === filter);

  el.innerHTML = `
    ${hero(livePick, cur, slots.filter(s => picks[s.id]).length, slots.length)}

    <section class="stack" style="gap:var(--sp-s)">
      <div class="row-between wrap" style="gap:12px">
        <div>
          <h2 style="font-size:var(--step-2)">Your year</h2>
          <p class="dim" style="font-size:var(--step--1);margin-top:3px">
            Any season can go in any block. Tap one to change it.</p>
        </div>
        <div class="row wrap" style="gap:8px">
          <div class="seg">
            ${Object.values(LAYOUTS).map(l =>
              `<button data-layout="${l.id}" aria-pressed="${layout() === l.id}">${l.id} blocks</button>`).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" id="resetYear">${icon('reset')}<span>Default</span></button>
        </div>
      </div>
      <p class="dim" style="font-size:var(--step--2);margin-top:-6px">${esc(LAYOUTS[layout()].hint)}</p>
      <div class="year-strip" style="${layout() === 4 ? '' : `grid-template-columns:repeat(auto-fit,minmax(170px,1fr))`}">
        ${slots.map(slot => slotCard(slot, picks[slot.id], cur)).join('')}
      </div>
    </section>

    <section class="stack" style="gap:var(--sp-s)">
      <div class="row-between wrap" style="gap:12px">
        <div>
          <h2 style="font-size:var(--step-2)">All ${SEASONS.length} seasons</h2>
          <p class="dim" style="font-size:var(--step--1);margin-top:3px">
            Each is built for a job. FEROX Recomp fits any block, any month.</p>
        </div>
        <div class="seg">
          ${[['all', 'All'], ['major', 'Main'], ['transition', 'Transition'], ['starter', 'Starter'], ['short', 'Short']]
            .map(([k, l]) => `<button data-filter="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="grid grid-2">${filtered.map(seasonCard).join('')}</div>
    </section>`;

  el.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => pickFlow(b.dataset.slot)));
  el.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => detail(seasonById(b.dataset.detail))));
  el.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; render(el); }));
  el.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', async () => {
    const n = +b.dataset.layout;
    await store.setLayout(n);
    await store.setSeasons(defaultYear(n));
    toast(`Switched to ${n} blocks`, 'ok');
  }));
  el.querySelector('#resetYear').addEventListener('click', async () => {
    if (await confirmDialog('Reset your year?', 'Puts the default rotation back: Greek Fire, Bridge, Winter Fire, Recomp.', { danger: false })) {
      await store.setSeasons(defaultYear(layout()));
      toast('Year reset');
    }
  });
}

function hero(season, slot, filled, total) {
  const left = daysBetween(NOW, nextEnd(slot, NOW));
  const pct = Math.round(slotProgress(slot, NOW) * 100);

  if (!season) {
    return `<div class="card card-pad-lg glow-edge">
      <p class="eyebrow row" style="gap:7px"><i class="glow-dot"></i>Running now · ${esc(slot.name)}</p>
      <h2 style="font-size:var(--step-3);margin:8px 0 6px">No season picked</h2>
      <p class="muted" style="font-size:var(--step--1);max-width:52ch">
        ${esc(formatWindow(slot))} — ${left} day${left === 1 ? '' : 's'} left in this block.</p>
      <button class="btn btn-primary glow-cta" style="margin-top:14px" data-slot="${slot.id}">
        ${icon('plus')}<span>Choose a season</span></button>
    </div>`;
  }

  return `<div class="card card-pad-lg glow-edge" style="--glow-color:${season.accent};--season:${season.accent}">
    <div class="row wrap" style="gap:var(--sp-m);align-items:center">
      <div class="season-art season-art-lg glow-aura" style="--season:${season.accent};--glow-color:${season.accent}">${seasonIcon(season)}</div>
      <div class="grow" style="min-width:230px">
        <p class="eyebrow row" style="gap:7px"><i class="glow-dot" style="--glow-color:${season.accent}"></i>Running now · ${esc(slot.name)}</p>
        <h2 style="font-size:var(--step-3);margin:8px 0 4px">${esc(season.name)}</h2>
        <p class="muted" style="font-size:var(--step--1)">${esc(season.tagline)} · ${esc(season.look)}</p>
        <div class="bar" style="margin-top:14px"><i style="width:${pct}%;background:linear-gradient(90deg,${season.accent},${season.accent2})"></i></div>
        <p class="dim" style="font-size:var(--step--2);margin-top:7px">
          ${esc(formatWindow(slot))} · ${pct}% through · ${left} day${left === 1 ? '' : 's'} to go · ${filled}/${total} blocks planned</p>
      </div>
      <div class="stack" style="gap:8px;min-width:140px">
        <button class="btn btn-sm" data-detail="${season.id}">${icon('chevron')}<span>Details</span></button>
        <button class="btn btn-ghost btn-sm" data-slot="${slot.id}">Change</button>
      </div>
    </div>
  </div>`;
}

function slotCard(slot, seasonId, cur) {
  const season = seasonId ? seasonById(seasonId) : null;
  const isNow = slot.id === cur.id;
  const starts = daysBetween(NOW, nextStart(slot, NOW));

  return `<button class="slot-card ${isNow ? 'is-now' : ''}" data-slot="${slot.id}"
      style="${season ? `--season:${season.accent}` : ''}"
      aria-label="${esc(slot.name)}${season ? `, currently ${esc(season.name)}` : ', empty'}">
    <div class="row-between" style="gap:8px">
      <span class="eyebrow">${esc(slot.short)}</span>
      ${isNow ? `<span class="season-chip" style="--season:${season?.accent ?? 'var(--ember)'}">
        <i class="glow-dot" style="width:6px;height:6px;--glow-color:${season?.accent ?? 'var(--ember)'}"></i>Now</span>`
        : `<span class="dim" style="font-size:var(--step--2)">in ${starts}d</span>`}
    </div>
    ${season ? `
      <div class="row" style="gap:10px">
        <span class="season-art" style="--season:${season.accent};width:40px;padding:6px">${seasonIcon(season)}</span>
        <span style="min-width:0">
          <strong style="font-size:var(--step--1);display:block">${esc(season.name)}</strong>
          <small class="dim">${esc(season.goal)}</small>
        </span>
      </div>`
      : `<div class="slot-empty">${icon('plus')}<span>Pick a season</span></div>`}
    <span class="dim" style="font-size:var(--step--2)">${esc(formatWindow(slot))}</span>
  </button>`;
}

function seasonCard(season) {
  const picked = Object.values(store.data.seasons ?? {}).includes(season.id);
  const where = isYearRound(season) ? 'Any block' : season.bestIn.map(id => slotById(id, 4)?.short ?? id).join(' · ');

  return `<article class="season-card glow-hover ${picked ? 'is-picked' : ''}" style="--season:${season.accent}">
    <div class="row" style="gap:var(--sp-s);align-items:flex-start">
      <span class="season-art" style="--season:${season.accent}">${seasonIcon(season)}</span>
      <div class="grow" style="min-width:0">
        <div class="row wrap" style="gap:7px;margin-bottom:5px">
          <span class="season-chip" style="--season:${season.accent}">Best in ${esc(where)}</span>
          ${picked ? `<span class="chip chip-ok">${icon('check')}In your year</span>` : ''}
        </div>
        <h3>${esc(season.name)}</h3>
        <p class="dim" style="font-size:var(--step--2);margin-top:2px">${esc(season.tagline)}</p>
      </div>
    </div>
    <p class="muted" style="font-size:var(--step--1)">${esc(season.blurb)}</p>
    <div class="stack" style="gap:7px">
      ${meta('Goal', season.goal)}
      ${meta('Calories', season.calories)}
      ${meta('The look', season.look)}
    </div>
    ${splitBar(season)}
    <button class="btn btn-sm" data-detail="${season.id}">Full breakdown</button>
  </article>`;
}

function splitBar(season) {
  const total = Object.values(season.split).reduce((x, y) => x + y, 0);
  const shades = [season.accent, season.accent2, 'var(--line-hi)'];
  return `<div>
    <div style="display:flex;height:7px;border-radius:var(--r-pill);overflow:hidden;gap:2px">
      ${Object.entries(season.split).map(([, v], i) =>
        `<i style="width:${(v / total) * 100}%;background:${shades[i]};display:block"></i>`).join('')}
    </div>
    <div class="row wrap" style="gap:12px;margin-top:7px">
      ${Object.entries(season.split).map(([k, v], i) =>
        `<span class="dim row" style="gap:5px;font-size:var(--step--2)">
          <i style="width:8px;height:8px;border-radius:2px;background:${shades[i]};display:block"></i>${esc(k)} ${v}%</span>`).join('')}
    </div>
  </div>`;
}

function pickFlow(slotId) {
  const slot = slotById(slotId, layout());
  const current = store.data.seasons?.[slotId];
  const rec = new Set(recommendedFor(slotId).map(s => s.id));
  // Recommended first, but everything is offered — people train around their lives.
  const options = [...SEASONS].sort((x, y) => (rec.has(y.id) ? 1 : 0) - (rec.has(x.id) ? 1 : 0));

  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(700px, calc(100vw - 24px))';
  dlg.innerHTML = `<div class="card card-pad-lg stack" style="gap:var(--sp-s)">
    <div class="row-between">
      <div>
        <p class="eyebrow">${esc(slot.name)} · ${esc(formatWindow(slot))}</p>
        <h3 style="font-size:var(--step-2);margin-top:4px">Pick your season</h3>
      </div>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <div class="stack" style="gap:9px;max-height:56vh;overflow-y:auto;padding-right:2px">
      ${options.map(s => `
        <button class="list-item glow-hover" style="--glow-color:${s.accent};text-align:left;cursor:pointer;width:100%"
            data-pick="${s.id}" aria-pressed="${current === s.id}">
          <span class="season-art" style="--season:${s.accent};width:42px;padding:7px">${seasonIcon(s)}</span>
          <span class="grow" style="min-width:0">
            <strong>${esc(s.name)}</strong>
            ${rec.has(s.id) ? `<span class="season-chip" style="--season:${s.accent}">Recommended</span>` : ''}
            <br><small>${esc(s.goal)} · ${esc(s.calories)}</small>
          </span>
          ${current === s.id ? `<span class="chip chip-ok">${icon('check')}Current</span>`
            : `<span style="color:var(--text-3);width:18px">${icon('chevron')}</span>`}
        </button>`).join('')}
    </div>
    <div class="row" style="justify-content:space-between;gap:10px">
      ${current ? `<button class="btn btn-ghost btn-sm" data-clear style="color:var(--bad)">${icon('trash')}<span>Empty block</span></button>` : '<span></span>'}
      <button class="btn btn-ghost" data-close>Done</button>
    </div>
  </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
    const s = seasonById(b.dataset.pick);
    await store.setSeason(slotId, s.id);
    close();
    toast(`${s.name} set for ${slot.short}`, 'ok');
  }));
  dlg.querySelector('[data-clear]')?.addEventListener('click', async () => {
    await store.setSeason(slotId, null);
    close();
    toast('Block emptied');
  });
  document.body.append(dlg);
  dlg.showModal();
}

function detail(season) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(640px, calc(100vw - 24px))';
  dlg.innerHTML = `<div class="card card-pad-lg stack" style="gap:var(--sp-s);--season:${season.accent}">
    <div class="row-between" style="align-items:flex-start">
      <div class="row" style="gap:var(--sp-s)">
        <span class="season-art season-art-lg glow-aura" style="--season:${season.accent};--glow-color:${season.accent}">${seasonIcon(season)}</span>
        <div>
          <h3 style="font-size:var(--step-2)">${esc(season.name)}</h3>
          <p class="dim" style="font-size:var(--step--1);margin-top:3px">${esc(season.tagline)}</p>
        </div>
      </div>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <p class="muted" style="font-size:var(--step--1)">${esc(season.blurb)}</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
      ${stat('Goal', season.goal)}${stat('Calories', season.calories)}${stat('The look', season.look)}
      ${stat('Rep range', `${season.repRange[0]}–${season.repRange[1]}`)}
      ${stat('Rest', `${season.restSec}s on compounds`)}
      ${stat('Protein', `${season.proteinPerKg} g/kg`)}
    </div>
    <div>
      <p class="eyebrow" style="margin-bottom:8px">Training emphasis</p>
      <div class="row wrap" style="gap:7px">${season.emphasis.map(e => `<span class="chip">${esc(e)}</span>`).join('')}</div>
    </div>
    ${season.avoid?.length ? `<div>
      <p class="eyebrow" style="margin-bottom:8px">What to avoid</p>
      <div class="row wrap" style="gap:7px">${season.avoid.map(e => `<span class="chip chip-warn">${esc(e)}</span>`).join('')}</div>
    </div>` : ''}
    <div>
      <p class="eyebrow" style="margin-bottom:8px">What to watch</p>
      <div class="row wrap" style="gap:7px">${season.watch.map(w => `<span class="season-chip" style="--season:${season.accent}">${esc(w)}</span>`).join('')}</div>
    </div>
    <div><p class="eyebrow" style="margin-bottom:8px">Time split</p>${splitBar(season)}</div>
    <button class="btn btn-primary btn-block" data-add>${icon('plus')}<span>Put this in my current block</span></button>
  </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.querySelector('[data-add]').addEventListener('click', async () => {
    close();
    const slot = live();
    await store.setSeason(slot.id, season.id);
    toast(`${season.name} set for ${slot.short}`, 'ok');
  });
  document.body.append(dlg);
  dlg.showModal();
}
