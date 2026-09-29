/** Workouts — routine library plus your training log. */
import { store } from '../core/store.js';
import { bootPage, esc, num, relDate, toast, confirmDialog } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { ROUTINES, EXERCISES, MUSCLES, byId, exerciseName } from '../core/seed.js';
import { logSessionFlow } from './_log.js';

const empty = msg => `<div class="card"><div class="empty">${icon('dumbbell')}<strong>${esc(msg)}</strong></div></div>`;

let filter = 'All';
let tab = 'routines';

const view = await bootPage({
  title: 'Workouts',
  actions: `<button class="btn btn-primary btn-sm" id="logBtn">${icon('plus')}<span>Log session</span></button>`,
}, render);

document.getElementById('logBtn').addEventListener('click', () => logSessionFlow());

function render(el) {
  el.innerHTML = `
    <div class="row-between wrap" style="gap:12px">
      <div class="seg" role="tablist">
        <button role="tab" aria-pressed="${tab === 'routines'}" data-tab="routines">Routines</button>
        <button role="tab" aria-pressed="${tab === 'history'}" data-tab="history">History</button>
        <button role="tab" aria-pressed="${tab === 'library'}" data-tab="library">Exercises</button>
      </div>
      ${tab === 'routines' || tab === 'library' ? `<div class="seg">
        ${['All', ...MUSCLES].map(m => `<button data-filter="${esc(m)}" aria-pressed="${filter === m}">${esc(m)}</button>`).join('')}
      </div>` : ''}
    </div>
    <div id="pane"></div>`;

  el.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => { tab = b.dataset.tab; render(el); }));
  el.querySelectorAll('[data-filter]').forEach(b =>
    b.addEventListener('click', () => { filter = b.dataset.filter; render(el); }));

  const pane = el.querySelector('#pane');
  if (tab === 'routines') routines(pane);
  else if (tab === 'history') history(pane);
  else library(pane);
}

function routines(pane) {
  const list = ROUTINES.filter(r => filter === 'All' || r.focus === filter);
  if (!list.length) return pane.innerHTML = empty('No routines for that filter.');

  pane.className = 'grid grid-3';
  pane.innerHTML = list.map(r => `
    <article class="card card-pad-lg card-interactive stack" style="gap:12px" data-open="${r.id}" tabindex="0" role="button">
      <div class="row-between" style="align-items:flex-start">
        <span class="chip chip-ember">${esc(r.focus)}</span>
        <span class="chip">${esc(r.level)}</span>
      </div>
      <div>
        <h3>${esc(r.name)}</h3>
        <p class="muted" style="font-size:.87rem;margin-top:5px">${esc(r.blurb)}</p>
      </div>
      <div class="row wrap dim" style="gap:12px;font-size:.78rem">
        <span class="row" style="gap:5px">${icon('clock')}${r.minutes} min</span>
        <span class="row" style="gap:5px">${icon('dumbbell')}${r.blocks.length} exercises</span>
        <span class="row" style="gap:5px">${icon('bolt')}${r.blocks.reduce((t, b) => t + b.sets, 0)} sets</span>
      </div>
      <button class="btn btn-primary btn-sm btn-block" data-start="${r.id}">${icon('bolt')}<span>Start</span></button>
    </article>`).join('');

  pane.querySelectorAll('svg').forEach(s => { if (s.closest('.row')) { s.style.width = '14px'; s.style.height = '14px'; } });
  pane.querySelectorAll('[data-start]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); logSessionFlow(b.dataset.start); }));
  pane.querySelectorAll('[data-open]').forEach(c => {
    const open = () => routineDetail(byId(ROUTINES, c.dataset.open));
    c.addEventListener('click', open);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

function routineDetail(r) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.innerHTML = `<div class="card card-pad-lg stack" style="gap:16px">
    <div class="row-between">
      <div>
        <p class="eyebrow">${esc(r.focus)} · ${esc(r.level)}</p>
        <h3 style="font-size:1.3rem;margin-top:4px">${esc(r.name)}</h3>
      </div>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <p class="muted" style="font-size:.9rem">${esc(r.blurb)}</p>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Exercise</th><th>Muscle</th><th style="text-align:right">Sets × reps</th></tr></thead>
      <tbody>${r.blocks.map(b => {
        const ex = byId(EXERCISES, b.ex);
        return `<tr><td><strong>${esc(ex.name)}</strong></td><td class="dim">${esc(ex.muscle)}</td>
          <td style="text-align:right" class="num">${b.sets} × ${b.reps}${ex.unit === 'sec' ? 's' : ex.unit === 'km' ? ' km' : ''}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <button class="btn btn-primary btn-block" data-go>${icon('bolt')}<span>Start this session</span></button>
  </div>`;
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.querySelector('[data-go]').addEventListener('click', () => { close(); logSessionFlow(r.id); });
  document.body.append(dlg);
  dlg.showModal();
}

function history(pane) {
  const sessions = store.data.sessions;
  pane.className = 'stack';
  if (!sessions.length) return pane.innerHTML = empty('Nothing logged yet. Start a routine and it lands here.');

  pane.innerHTML = `<div class="card card-pad-lg">
    <div class="card-head">
      <h3>${sessions.length} sessions</h3>
      <span class="chip">${num(sessions.reduce((t, s) => t + store.sessionVolume(s), 0))} kg lifted</span>
    </div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Session</th><th>When</th><th>Time</th><th>Volume</th><th>Exercises</th><th></th></tr></thead>
      <tbody>${sessions.slice(0, 80).map(s => `
        <tr>
          <td><strong>${esc(s.name)}</strong>${s.note ? `<br><small class="dim">${esc(s.note)}</small>` : ''}</td>
          <td class="dim">${relDate(s.date)}</td>
          <td class="num">${s.durationMin} min</td>
          <td class="num">${num(store.sessionVolume(s))} kg</td>
          <td class="dim" style="max-width:260px">${esc((s.entries ?? []).map(e => exerciseName(e.ex)).join(', ')) || '—'}</td>
          <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-rm="${s.id}" aria-label="Delete session">${icon('trash')}</button></td>
        </tr>`).join('')}</tbody>
    </table></div>
    ${sessions.length > 80 ? `<p class="dim" style="font-size:.78rem;margin-top:12px">Showing the 80 most recent.</p>` : ''}
  </div>`;

  pane.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
    if (await confirmDialog('Delete session?', 'This removes the session and its sets. It cannot be undone.')) {
      await store.removeSession(b.dataset.rm);
      toast('Session deleted');
    }
  }));
}

function library(pane) {
  const list = EXERCISES.filter(e => filter === 'All' || e.muscle === filter);
  const prs = new Map(store.personalRecords().map(p => [p.ex, p]));
  pane.className = 'stack';
  pane.innerHTML = `<div class="card card-pad-lg">
    <div class="card-head"><h3>${list.length} exercises</h3></div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Exercise</th><th>Muscle</th><th>Type</th><th style="text-align:right">Your best</th></tr></thead>
      <tbody>${list.map(e => {
        const pr = prs.get(e.id);
        return `<tr>
          <td><strong>${esc(e.name)}</strong></td>
          <td class="dim">${esc(e.muscle)}</td>
          <td><span class="chip">${esc(e.kind)}</span></td>
          <td style="text-align:right" class="num">${pr
            ? (e.kind === 'strength' && e.unit === 'kg'
                ? `${pr.weight} kg × ${pr.reps}`
                : `${pr.reps} ${e.unit === 'sec' ? 'sec' : e.unit === 'km' ? 'km' : 'reps'}`)
            : '<span class="dim">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}
