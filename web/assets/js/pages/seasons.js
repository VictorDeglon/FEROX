/** Seasons — the training year: four blocks, eight seasons, one pick each. */
import { store } from '../core/store.js';
import { bootPage, esc, toast, confirmDialog } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { seasonIcon } from '../core/season-icons.js';
import {
  SLOTS, SEASONS, seasonById, slotById, seasonsForSlot, isYearRound,
  currentSlot, formatWindow, nextStart, nextEnd, daysBetween, slotProgress,
} from '../core/seasons.js';

const meta = (k, v) => `<div class="row-between" style="font-size:var(--step--1);gap:12px">
  <span class="dim">${esc(k)}</span><span style="text-align:right">${esc(v)}</span></div>`;

const stat = (label, value) => `<div class="stat">
  <span class="stat-label">${esc(label)}</span>
  <span style="font-size:var(--step--1);font-weight:600">${esc(value)}</span></div>`;

const NOW = new Date();
const LIVE = currentSlot(NOW);

await bootPage({ title: 'Seasons' }, render);

function render(el) {
  const picks = store.data.seasons ?? {};
  const filled = SLOTS.filter(s => picks[s.id]).length;
  const livePick = picks[LIVE.id] ? seasonById(picks[LIVE.id]) : null;

  el.innerHTML = `
    ${hero(livePick, filled)}

    <section class="stack" style="gap:var(--sp-s)">
      <div class="row-between wrap" style="gap:12px">
        <div>
          <h2 style="font-size:var(--step-2)">Your year</h2>
          <p class="dim" style="font-size:var(--step--1);margin-top:3px">
            Four blocks. Tap one to choose what you run in it.</p>
        </div>
        ${filled ? `<button class="btn btn-ghost btn-sm" id="clearAll">${icon('trash')}<span>Clear all</span></button>` : ''}
      </div>
      <div class="year-strip">${SLOTS.map(slot => slotCard(slot, picks[slot.id])).join('')}</div>
    </section>

    <section class="stack" style="gap:var(--sp-s)">
      <div>
        <h2 style="font-size:var(--step-2)">The eight seasons</h2>
        <p class="dim" style="font-size:var(--step--1);margin-top:3px">
          Each one is built for a time of year. FEROX Recomp is the exception — it fits every block.</p>
      </div>
      <div class="grid grid-2">${SEASONS.map(seasonCard).join('')}</div>
    </section>`;

  el.querySelectorAll('[data-slot]').forEach(b =>
    b.addEventListener('click', () => pickFlow(b.dataset.slot)));
  el.querySelectorAll('[data-detail]').forEach(b =>
    b.addEventListener('click', () => detail(seasonById(b.dataset.detail))));
  el.querySelector('#clearAll')?.addEventListener('click', async () => {
    if (await confirmDialog('Clear your year?', 'Every block goes back to empty. You can pick again straight away.')) {
      await store.setSeasons({});
      toast('Year cleared');
    }
  });
}

/* ---------------------------------------------------------------- sections */

function hero(live, filled) {
  const days = daysBetween(NOW, nextEnd(LIVE, NOW));
  const pctDone = Math.round(slotProgress(LIVE, NOW) * 100);

  if (!live) {
    return `<div class="card card-pad-lg glow-edge" style="--glow-color:var(--ember)">
      <div class="row wrap" style="gap:var(--sp-m);align-items:center">
        <div class="grow" style="min-width:240px">
          <p class="eyebrow row" style="gap:7px"><i class="glow-dot"></i>Running now · ${esc(LIVE.name)}</p>
          <h2 style="font-size:var(--step-3);margin:8px 0 6px">No season picked yet</h2>
          <p class="muted" style="font-size:var(--step--1);max-width:52ch">
            ${esc(formatWindow(LIVE))} — ${days} day${days === 1 ? '' : 's'} left in this block.
            Pick a season and the app knows what you're training for.</p>
          <button class="btn btn-primary glow-cta" style="margin-top:14px" data-slot="${LIVE.id}">
            ${icon('plus')}<span>Choose your ${esc(LIVE.short.toLowerCase())} season</span></button>
        </div>
      </div>
    </div>`;
  }

  return `<div class="card card-pad-lg glow-edge" style="--glow-color:${live.accent};--season:${live.accent}">
    <div class="row wrap" style="gap:var(--sp-m);align-items:center">
      <div class="season-art season-art-lg glow-aura" style="--season:${live.accent};--glow-color:${live.accent}">
        ${seasonIcon(live)}
      </div>
      <div class="grow" style="min-width:230px">
        <p class="eyebrow row" style="gap:7px">
          <i class="glow-dot" style="--glow-color:${live.accent}"></i>Running now · ${esc(LIVE.name)}
        </p>
        <h2 style="font-size:var(--step-3);margin:8px 0 4px">${esc(live.name)}</h2>
        <p class="muted" style="font-size:var(--step--1)">${esc(live.tagline)} · ${esc(live.goal)}</p>
        <div class="bar" style="margin-top:14px"><i style="width:${pctDone}%;background:linear-gradient(90deg,${live.accent},${live.accent2})"></i></div>
        <p class="dim" style="font-size:var(--step--2);margin-top:7px">
          ${esc(formatWindow(LIVE))} · ${pctDone}% through · ${days} day${days === 1 ? '' : 's'} to go</p>
      </div>
      <div class="stack" style="gap:8px;min-width:150px">
        <button class="btn btn-sm" data-detail="${live.id}">${icon('chevron')}<span>Season detail</span></button>
        <button class="btn btn-ghost btn-sm" data-slot="${LIVE.id}">Change</button>
      </div>
    </div>
    <p class="dim" style="font-size:var(--step--2);margin-top:var(--sp-s)">
      ${filled} of ${SLOTS.length} blocks planned.</p>
  </div>`;
}

function slotCard(slot, seasonId) {
  const season = seasonId ? seasonById(seasonId) : null;
  const isNow = slot.id === LIVE.id;
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
  const windows = isYearRound(season) ? 'Any block, all year' : season.slots.map(id => slotById(id).short).join(' · ');

  return `<article class="season-card glow-hover ${picked ? 'is-picked' : ''}" style="--season:${season.accent}">
    <div class="row" style="gap:var(--sp-s);align-items:flex-start">
      <span class="season-art" style="--season:${season.accent}">${seasonIcon(season)}</span>
      <div class="grow" style="min-width:0">
        <div class="row wrap" style="gap:7px;margin-bottom:5px">
          <span class="season-chip" style="--season:${season.accent}">${esc(windows)}</span>
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
      ${meta('Runs', isYearRound(season) ? 'All year' : season.slots.map(id => formatWindow(slotById(id))).join(' · '))}
    </div>
    ${splitBar(season)}
    <button class="btn btn-sm" data-detail="${season.id}">Full breakdown</button>
  </article>`;
}

function splitBar(season) {
  const total = Object.values(season.split).reduce((a, b) => a + b, 0);
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

/* ----------------------------------------------------------------- dialogs */

function pickFlow(slotId) {
  const slot = slotById(slotId);
  const options = seasonsForSlot(slotId);
  const current = store.data.seasons?.[slotId];

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
    <p class="dim" style="font-size:var(--step--1)">
      ${options.length} season${options.length === 1 ? '' : 's'} are built for this block.</p>
    <div class="stack" style="gap:9px">
      ${options.map(s => `
        <button class="list-item glow-hover" style="--glow-color:${s.accent};text-align:left;cursor:pointer;width:100%"
            data-pick="${s.id}" aria-pressed="${current === s.id}">
          <span class="season-art" style="--season:${s.accent};width:42px;padding:7px">${seasonIcon(s)}</span>
          <span class="grow" style="min-width:0">
            <strong>${esc(s.name)}</strong>${isYearRound(s) ? ' <span class="season-chip" style="--season:' + s.accent + '">Any block</span>' : ''}
            <br><small>${esc(s.goal)} · ${esc(s.calories)}</small>
          </span>
          ${current === s.id ? `<span class="chip chip-ok">${icon('check')}Current</span>` : `<span style="color:var(--text-3);width:18px">${icon('chevron')}</span>`}
        </button>`).join('')}
    </div>
    <div class="row" style="justify-content:space-between;gap:10px">
      ${current ? `<button class="btn btn-ghost btn-sm" data-clear style="color:var(--bad)">${icon('trash')}<span>Empty this block</span></button>` : '<span></span>'}
      <button class="btn btn-ghost" data-close>Done</button>
    </div>
  </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  dlg.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
    const season = seasonById(b.dataset.pick);
    await store.setSeason(slotId, season.id);
    close();
    toast(`${season.name} set for ${slot.short.toLowerCase()}`, 'ok');
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

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
      ${stat('Goal', season.goal)}${stat('Calories', season.calories)}
      ${stat('Runs', isYearRound(season) ? 'All year' : season.slots.map(id => slotById(id).short).join(', '))}
    </div>

    <div>
      <p class="eyebrow" style="margin-bottom:8px">Training emphasis</p>
      <div class="row wrap" style="gap:7px">
        ${season.emphasis.map(e => `<span class="chip">${esc(e)}</span>`).join('')}
      </div>
    </div>

    <div>
      <p class="eyebrow" style="margin-bottom:8px">What to watch</p>
      <div class="row wrap" style="gap:7px">
        ${season.watch.map(w => `<span class="season-chip" style="--season:${season.accent}">${esc(w)}</span>`).join('')}
      </div>
    </div>

    <div>
      <p class="eyebrow" style="margin-bottom:8px">Time split</p>
      ${splitBar(season)}
    </div>

    <div>
      <p class="eyebrow" style="margin-bottom:8px">Calendar</p>
      ${(isYearRound(season) ? SLOTS : season.slots.map(slotById)).map(s => `
        <div class="row-between" style="font-size:var(--step--1);padding:7px 0;border-bottom:1px solid var(--line)">
          <span>${esc(s.name)}</span>
          <span class="dim">${esc(formatWindow(s))}</span>
        </div>`).join('')}
    </div>

    <button class="btn btn-primary btn-block" data-add>${icon('plus')}<span>Add to my year</span></button>
  </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.querySelector('[data-add]').addEventListener('click', async () => {
    close();
    // Year-round seasons can go anywhere, so ask which block rather than guessing.
    const target = isYearRound(season) ? LIVE.id
      : (season.slots.includes(LIVE.id) ? LIVE.id : season.slots[0]);
    await store.setSeason(target, season.id);
    toast(`${season.name} added to ${slotById(target).short.toLowerCase()}`, 'ok');
  });

  document.body.append(dlg);
  dlg.showModal();
}
