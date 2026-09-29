/** Records — personal bests, with an estimated one-rep max for barbell lifts. */
import { store } from '../core/store.js';
import { bootPage, esc, num, relDate } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { MUSCLES, EXERCISES, byId } from '../core/seed.js';
import { lineChart } from '../core/chart.js';

let filter = 'All';

await bootPage({ title: 'Records' }, render);

function render(el) {
  const prs = store.personalRecords();
  const list = prs.filter(p => filter === 'All' || p.muscle === filter);

  el.innerHTML = `
    <div class="row-between wrap" style="gap:12px">
      <div>
        <h2 style="font-size:1.1rem">${prs.length} personal record${prs.length === 1 ? '' : 's'}</h2>
        <p class="dim" style="font-size:.84rem;margin-top:3px">
          Barbell and dumbbell lifts show an estimated 1RM (Epley). Bodyweight and cardio show your best effort.</p>
      </div>
      <div class="seg">
        ${['All', ...MUSCLES].map(m => `<button data-f="${esc(m)}" aria-pressed="${filter === m}">${esc(m)}</button>`).join('')}
      </div>
    </div>

    ${list.length ? `<section class="grid grid-3">${list.map(card).join('')}</section>`
      : `<div class="card"><div class="empty">${icon('target')}
         <strong>No records in this group yet</strong>
         <p style="font-size:.85rem">Log a session with these lifts and they'll show up here.</p>
         <a class="btn btn-primary btn-sm" href="workouts.html">${icon('plus')}<span>Log a session</span></a></div></div>`}`;

  el.querySelectorAll('[data-f]').forEach(b =>
    b.addEventListener('click', () => { filter = b.dataset.f; render(el); }));
  el.querySelectorAll('[data-hist]').forEach(b =>
    b.addEventListener('click', () => historyDialog(b.dataset.hist)));
}

function card(p) {
  const isLift = p.kind === 'strength' && p.unit === 'kg';
  const headline = isLift
    ? `${p.weight}<span class="stat-unit">kg × ${p.reps}</span>`
    : `${p.reps}<span class="stat-unit">${p.unit === 'sec' ? 'sec' : p.unit === 'km' ? 'km' : 'reps'}</span>`;

  return `<article class="card card-pad-lg stack" style="gap:12px">
    <div class="row-between" style="align-items:flex-start">
      <div>
        <p class="eyebrow">${esc(p.muscle)}</p>
        <h3 style="margin-top:4px">${esc(p.name)}</h3>
      </div>
      <span style="color:var(--ember);width:20px;opacity:.8">${icon('target')}</span>
    </div>
    <div class="stat">
      <span class="stat-value">${headline}</span>
      ${isLift ? `<span class="dim" style="font-size:.78rem">Est. 1RM ${Math.round(p.score)} kg</span>` : ''}
    </div>
    <div class="row-between">
      <span class="chip">${relDate(p.date)}</span>
      <button class="btn btn-ghost btn-sm" data-hist="${p.ex}">Trend</button>
    </div>
  </article>`;
}

/** Every top set logged for one exercise, over time. */
function historyDialog(exId) {
  const ex = byId(EXERCISES, exId);
  const points = [];
  for (const s of [...store.data.sessions].reverse()) {
    const entry = (s.entries ?? []).find(e => e.ex === exId);
    if (!entry?.sets?.length) continue;
    const best = entry.sets.reduce((a, b) =>
      ((+b.weight || 0) * (1 + (+b.reps || 0) / 30)) > ((+a.weight || 0) * (1 + (+a.reps || 0) / 30)) ? b : a);
    const value = ex.kind === 'strength' && ex.unit === 'kg'
      ? Math.round((+best.weight || 0) * (1 + (+best.reps || 0) / 30))
      : (+best.reps || 0);
    if (value) points.push({ date: s.date, value });
  }

  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(620px, calc(100vw - 24px))';
  const unit = ex.kind === 'strength' && ex.unit === 'kg' ? 'kg est. 1RM'
    : ex.unit === 'sec' ? 'sec' : ex.unit === 'km' ? 'km' : 'reps';

  dlg.innerHTML = `<div class="card card-pad-lg stack" style="gap:16px">
    <div class="row-between">
      <div><p class="eyebrow">${esc(ex.muscle)}</p><h3 style="margin-top:4px">${esc(ex.name)}</h3></div>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
    </div>
    ${points.length > 1
      ? `${lineChart(points, { height: 190, label: ex.name, fmt: v => `${v} ${unit}` })}
         <div class="row-between dim" style="font-size:.76rem">
           <span>${points[0].date}</span><span>${points.length} sessions</span><span>${points.at(-1).date}</span>
         </div>`
      : `<p class="dim" style="font-size:.88rem">Log this lift a few more times and a trend line appears here.</p>`}
    <div class="row-between" style="font-size:.86rem">
      <span class="muted">Best</span>
      <span class="num"><strong>${points.length ? Math.max(...points.map(p => p.value)) : 0}</strong> ${esc(unit)}</span>
    </div>
  </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  document.body.append(dlg);
  dlg.showModal();
}
