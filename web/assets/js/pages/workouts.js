/** Workouts — routine library plus your training log. */
import { store } from '../core/store.js';
import { bootPage, esc, num, relDate, toast, confirmDialog } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { ROUTINES, EXERCISES, MUSCLES, byId, exerciseName } from '../core/seed.js';
import { mountCatalog } from './_catalog.js';
import { logSessionFlow } from './_log.js';
import { askReadiness, readinessBar } from './_readiness.js';
import { buildWeek, weeklyFrequency, templateForSeason, modeFor } from '../core/split.js';
import { seasonById, currentSlot } from '../core/seasons.js';
import { strengthProfile, strengthRanking, predicted1RM, observed1RM, isLoaded } from '../core/strength.js';
import { seasonIcon } from '../core/season-icons.js';

const empty = msg => `<div class="card"><div class="empty">${icon('dumbbell')}<strong>${esc(msg)}</strong></div></div>`;

let filter = 'All';
let tab = 'plan';

const view = await bootPage({
  title: 'Workouts',
  actions: `<button class="btn btn-primary btn-sm" id="logBtn">${icon('plus')}<span>Log session</span></button>`,
}, render);

document.getElementById('logBtn').addEventListener('click', () => logSessionFlow());

function render(el) {
  el.innerHTML = `
    <div class="row-between wrap" style="gap:12px">
      <div class="seg" role="tablist">
        <button role="tab" aria-pressed="${tab === 'plan'}" data-tab="plan">Your plan</button>
        <button role="tab" aria-pressed="${tab === 'routines'}" data-tab="routines">Routines</button>
        <button role="tab" aria-pressed="${tab === 'history'}" data-tab="history">History</button>
        <button role="tab" aria-pressed="${tab === 'library'}" data-tab="library">Exercises</button>
      </div>
      ${tab === 'routines' ? `<div class="seg">
        ${['All', ...MUSCLES].map(m => `<button data-filter="${esc(m)}" aria-pressed="${filter === m}">${esc(m)}</button>`).join('')}
      </div>` : ''}
    </div>
    <div id="pane"></div>`;

  el.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => { tab = b.dataset.tab; render(el); }));
  el.querySelectorAll('[data-filter]').forEach(b =>
    b.addEventListener('click', () => { filter = b.dataset.filter; render(el); }));

  const pane = el.querySelector('#pane');
  if (tab === 'plan') plan(pane, el);
  else if (tab === 'routines') routines(pane);
  else if (tab === 'history') history(pane);
  else library(pane);
}

/** The week FEROX built for this person, scaled by how they feel today. */
function plan(pane, root) {
  const p = store.data.profile;
  const slot = currentSlot(store.data.layout ?? 4);
  const season = seasonById(store.data.seasons?.[slot.id]) ?? seasonById('ferox-recomp');
  const score = store.readinessFor() ?? 7;
  const week = buildWeek(p, season, score, store.weekIndex(), store.data);
  const freq = weeklyFrequency(week);
  const main = ['Chest', 'Back', 'Legs', 'Shoulders'].filter(m => freq[m]);
  const tpl = templateForSeason(p.daysPerWeek, season);
  const mode = modeFor(season);
  const wk = store.weekIndex();
  const trends = strengthProfile(store.data, p);
  const rank = strengthRanking(trends);

  pane.className = 'stack';
  pane.innerHTML = `<div id="readySlot"></div>

    <div class="card card-pad-lg glow-edge" style="--glow-color:${season.accent};--season:${season.accent}">
      <div class="row wrap" style="gap:var(--sp-s);align-items:center">
        <span class="season-art" style="--season:${season.accent}">${seasonIcon(season)}</span>
        <div class="grow" style="min-width:180px">
          <p class="eyebrow">${esc(slot.name)} · week ${wk + 1}</p>
          <h3 style="font-size:var(--step-1);margin-top:3px">${esc(season.name)} · ${esc(tpl.name)}</h3>
          <p class="dim" style="font-size:var(--step--2);margin-top:3px">${esc(season.goal)} · ${season.repRange[0]}–${season.repRange[1]} reps · ${season.restSec}s rest</p>
        </div>
        ${main.length ? `<span class="chip chip-ok">each muscle ${Math.min(...main.map(m => freq[m]))}–${Math.max(...main.map(m => freq[m]))}× a week</span>` : ''}
      </div>

      <div class="row wrap" style="gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
        <span class="chip chip-ember">${esc(mode.label)}</span>
        <span class="chip">${mode.setsMain} sets on the main lifts</span>
        <span class="chip">${mode.setsAcc} on accessories</span>
        ${mode.intensity < 1 ? `<span class="chip">bar at ${Math.round(mode.intensity * 100)}%</span>` : ''}
      </div>
      <p class="muted" style="font-size:var(--step--1);margin-top:10px">${esc(mode.blurb)}</p>

      ${wk < 3 ? `<p class="dim" style="font-size:var(--step--2);margin-top:12px">
        Week ${wk + 1} runs ${Math.round((({0:1.15,1:1.08,2:1.03}[wk] ?? 1) - 1) * 100)}% above your steady state — it settles by week four.</p>` : ''}
    </div>

    ${trendCard(rank, p)}

    <div class="grid grid-2">
      ${week.days.map((d, i) => `
        <article class="card card-pad-lg stack" style="gap:12px">
          <div class="row-between">
            <div>
              <p class="eyebrow">Day ${i + 1}</p>
              <h3 style="margin-top:3px">${esc(d.name)}</h3>
            </div>
            <span class="chip">${d.minutes} min</span>
          </div>
          <div class="row wrap" style="gap:6px">
            ${d.focus.map(f => `<span class="chip chip-ember">${esc(f)}</span>`).join('')}
          </div>
          <div class="table-wrap"><table class="data">
            <tbody>${d.entries.map(e => `
              <tr>
                <td><strong>${esc(e.name)}</strong>${e.finisher ? ' <span class="chip chip-warn">finisher</span>' : ''}
                  <br><small class="dim">${esc(e.muscle)} · ${e.rest}s rest</small></td>
                <td style="text-align:right" class="num">
                  <strong>${e.sets} × ${e.reps}${e.load ? ` @ ${e.load.kg} kg` : ''}</strong>
                  <br><small class="dim">${e.load
                    ? `${e.rir} in reserve · ${loadSource(e.load)}`
                    : `${e.rir} in reserve`}</small></td>
              </tr>`).join('')}</tbody>
          </table></div>
          <button class="btn btn-primary btn-sm btn-block" data-start-day="${i}">${icon('bolt')}<span>Start this session</span></button>
        </article>`).join('')}
    </div>

    <p class="dim" style="font-size:var(--step--2)">
      Built from your setup answers, ${esc(season.name)} and everything you have logged.
      Weights start deliberately low and climb as you hit your reps — it costs thirty seconds
      to add a plate and a great deal more to come back from a session that was too heavy.</p>`;

  pane.querySelector('#readySlot').replaceWith(readinessBar(() => render(root)));
  pane.querySelectorAll('[data-start-day]').forEach(b =>
    b.addEventListener('click', () => logSessionFlow(null, week.days[+b.dataset.startDay])));
}

/** Where a prescribed weight came from, in three words. */
function loadSource(load) {
  return { logged: 'from your log', muscle: 'from your trend', estimate: 'first guess' }[load.source] ?? '';
}

/**
 * What the log says about each muscle group, against what was predicted.
 *
 * This is the card that explains why the weights move. It is deliberately blunt
 * about sample size — one logged lift is an anecdote, and a plan that swung a
 * whole muscle group's prescription on one anecdote would deserve to be ignored.
 */
function trendCard(rank, p) {
  if (!rank.rows.length) {
    return `<div class="card card-pad-lg">
      <div class="card-head"><h3>Strength profile</h3><span class="chip">nothing logged</span></div>
      <p class="muted" style="font-size:var(--step--1)">
        Every weight below is a first guess from your bodyweight, age and experience — and a
        deliberately light one. Log a few sessions and FEROX starts using what you actually
        lifted instead, muscle group by muscle group.</p>
    </div>`;
  }

  return `<div class="card card-pad-lg">
    <div class="card-head">
      <h3>Strength profile</h3>
      ${rank.strongest ? `<span class="chip chip-ok">${esc(rank.strongest.muscle)} leads</span>` : ''}
    </div>
    <div class="stack" style="gap:11px">
      ${rank.rows.map(r => {
        // 1.0 is the prediction; the bar runs 0.6–1.4 so being on track sits
        // halfway across rather than looking like a failure.
        const pctAcross = Math.max(4, Math.min(100, ((r.ratio - 0.6) / 0.8) * 100));
        const tone = r.ratio >= 1.08 ? 'var(--ok)' : r.ratio > 0.92 ? 'var(--ember)' : 'var(--warn)';
        return `<div>
          <div class="row-between" style="margin-bottom:5px">
            <span style="font-size:var(--step--1);font-weight:600">${esc(r.muscle)}</span>
            <span class="dim num" style="font-size:var(--step--2)">
              ${esc(r.label)} · ${Math.round(r.ratio * 100)}% of estimate
              ${r.confident ? '' : ' · <span title="One lift is not a trend">1 lift</span>'}
            </span>
          </div>
          <div class="bar"><i style="width:${pctAcross.toFixed(0)}%;background:${tone}"></i></div>
        </div>`;
      }).join('')}
    </div>
    <p class="dim" style="font-size:var(--step--2);margin-top:12px">
      Measured against what the standards predict for ${p.weightKg ? `${p.weightKg} kg` : 'your bodyweight'},
      age ${p.age ?? '—'} and your stated experience. A group that is ahead earns heavier weight;
      one that is behind earns an extra set, which is the other way round on purpose.
    </p>
  </div>`;
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

/**
 * The exercise catalog.
 *
 * A thousand movements, searchable by name, muscle or kit, each one opening a
 * body map that says what it works. The old version was a flat table of fifty
 * rows, which stopped being viable the moment the catalogue grew.
 */
function library(pane) {
  pane.className = 'stack';
  pane.innerHTML = `<div class="card card-pad-lg">
    <div class="card-head">
      <h3>Exercise catalog</h3>
      <span class="chip num">${EXERCISES.length.toLocaleString()}</span>
    </div>
    <div id="catHost"></div>
  </div>`;

  mountCatalog(pane.querySelector('#catHost'), {
    profile: store.data.profile,
    equipment: store.data.profile.equipment,
    limits: store.data.profile.limits,
  });
}
