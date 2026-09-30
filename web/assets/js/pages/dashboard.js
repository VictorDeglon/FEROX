/** Today — the landing surface once you're in the app. */
import { store, todayISO } from '../core/store.js';
import { bootPage, esc, num, kcal, pct, relDate, toast, modal } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { ring, heatmap, lineChart } from '../core/chart.js';
import { ROUTINES, MEDALS, byId } from '../core/seed.js';
import { seasonById, currentSlot, formatWindow, nextEnd, daysBetween, slotProgress } from '../core/seasons.js';
import { seasonIcon } from '../core/season-icons.js';
import { logSessionFlow } from './_log.js';
import { askReadiness, readinessBar } from './_readiness.js';
import { maybeAskWeighIn, weighInBar } from './_weighin.js';
import { planStatus, planHeadline } from '../core/plan.js';

const view = await bootPage({
  title: 'Today',
  actions: `<button class="btn btn-primary btn-sm" id="quickLog">${icon('plus')}<span>Log session</span></button>`,
}, render);

document.getElementById('quickLog').addEventListener('click', () => logSessionFlow());

/*
 * The two daily prompts, one after the other and never at the same time.
 * Readiness first because it changes what today's session looks like; the
 * weigh-in second, and only when the schedule says it is due. Both wait for
 * the page to settle rather than landing on top of a loading skeleton.
 */
setTimeout(async () => {
  if (!store.readinessFor()) await askReadiness();
  await maybeAskWeighIn();
}, 900);

function render(el) {
  const d = store.data;
  const s = store.stats();
  const goals = d.profile.goals;
  const m = store.macrosFor();
  const today = d.sessions.filter(x => x.date === todayISO());
  const todayVolume = today.reduce((t, x) => t + store.sessionVolume(x), 0);

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);
  const weekSessions = d.sessions.filter(x => Date.parse(x.date) >= weekStart.setHours(0, 0, 0, 0)).length;

  const activity = new Map();
  for (const sess of d.sessions) activity.set(sess.date, (activity.get(sess.date) ?? 0) + 1);

  const recentMedals = d.medals.slice(-4).reverse().map(id => byId(MEDALS, id)).filter(Boolean);
  const suggestion = ROUTINES[d.sessions.length % ROUTINES.length];

  const plan = planStatus(d);

  el.innerHTML = `
    <div id="readySlot"></div>
    <div id="weighSlot"></div>

    <section class="grid grid-4">
      ${tile('Streak', s.streak, 'days', s.streak >= 3 ? `Best ${s.bestStreak}` : 'Keep it going', 'flame', s.streak > 0)}
      ${tile('This week', weekSessions, `/ ${goals.sessionsPerWeek}`, weekSessions >= goals.sessionsPerWeek ? 'Target hit' : `${goals.sessionsPerWeek - weekSessions} to go`, 'calendar')}
      ${tile('Volume today', num(todayVolume), 'kg', today.length ? `${today.length} session${today.length > 1 ? 's' : ''}` : 'Nothing yet', 'dumbbell')}
      ${tile('Medals', d.medals.length, `/ ${MEDALS.length}`, `${MEDALS.length - d.medals.length} to unlock`, 'medal')}
    </section>

    <section class="grid grid-main">
      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="card-head">
            <h3>Today's fuel</h3>
            <a class="card-link" href="nutrition.html">Open tracker →</a>
          </div>
          <div class="row wrap" style="gap:26px;align-items:center">
            ${ring([{ value: m.kcal, color: 'var(--ember)' }], {
              max: goals.kcal, size: 148, stroke: 13,
              center: `<div><div class="stat-value" style="font-size:1.6rem">${num(m.kcal)}</div>
                       <div class="dim" style="font-size:.7rem">of ${num(goals.kcal)} kcal</div></div>`,
            })}
            <div class="grow stack" style="gap:13px;min-width:200px">
              ${macroBar('Protein', m.p, goals.protein, 'var(--viz-2)')}
              ${macroBar('Carbs',   m.c, goals.carbs,   'var(--viz-4)')}
              ${macroBar('Fat',     m.f, goals.fat,     'var(--viz-3)')}
            </div>
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Consistency</h3><span class="chip">${s.sessions} sessions all time</span></div>
          ${heatmap(activity, { weeks: 18, label: 'Training days' })}
          <p class="dim" style="font-size:.74rem;margin-top:10px">Last 18 weeks. Darker means more work that day.</p>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Volume trend</h3><a class="card-link" href="progress.html">All charts →</a></div>
          ${lineChart(store.volumeSeries(30), { height: 150, label: 'Daily volume', fmt: v => `${num(v)} kg` })}
        </div>
      </div>

      <div class="stack" style="gap:16px">
        ${seasonCard()}
        ${checkpointCard(plan)}

        <div class="card card-pad-lg" style="background:var(--surf-1);position:relative;overflow:hidden">
          <p class="eyebrow">Up next</p>
          <h3 style="font-size:1.3rem;margin:6px 0 4px">${esc(suggestion.name)}</h3>
          <p class="muted" style="font-size:.87rem">${esc(suggestion.blurb)}</p>
          <div class="row wrap" style="gap:7px;margin:14px 0 16px">
            <span class="chip chip-ember">${icon('clock')}${suggestion.minutes} min</span>
            <span class="chip">${esc(suggestion.level)}</span>
            <span class="chip">${esc(suggestion.focus)}</span>
          </div>
          <button class="btn btn-primary btn-block" data-routine="${suggestion.id}">${icon('bolt')}<span>Start this</span></button>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Recent sessions</h3><a class="card-link" href="workouts.html">All →</a></div>
          ${d.sessions.length ? `<div class="list">${d.sessions.slice(0, 5).map(sess => `
            <div class="list-item">
              <span style="color:var(--ember);display:grid;place-items:center;width:20px">${icon('dumbbell')}</span>
              <div class="grow" style="min-width:0">
                <strong>${esc(sess.name)}</strong><br>
                <small>${relDate(sess.date)} · ${sess.durationMin} min · ${num(store.sessionVolume(sess))} kg</small>
              </div>
            </div>`).join('')}</div>`
            : `<div class="empty">${icon('dumbbell')}<strong>No sessions yet</strong>
               <p style="font-size:.84rem">Log your first one and the charts wake up.</p></div>`}
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Latest medals</h3><a class="card-link" href="medals.html">All →</a></div>
          ${recentMedals.length ? `<div class="grid" style="grid-template-columns:repeat(2,1fr);gap:6px">
            ${recentMedals.map(md => `<div class="medal earned" style="padding:12px 6px">
              <div class="medal-disc" style="width:52px;height:52px">${icon(md.icon)}</div>
              <span class="medal-name" style="font-size:.74rem">${esc(md.name)}</span>
            </div>`).join('')}</div>`
            : `<p class="dim" style="font-size:.86rem">Train to start unlocking these.</p>`}
        </div>
      </div>
    </section>`;

  el.querySelector('#readySlot').replaceWith(readinessBar(() => render(el)));
  el.querySelector('#weighSlot').replaceWith(weighInBar(() => render(el)));

  el.querySelectorAll('[data-routine]').forEach(btn =>
    btn.addEventListener('click', () => logSessionFlow(btn.dataset.routine)));

  el.querySelectorAll('.medal-disc svg').forEach(sv => { sv.style.width = '24px'; sv.style.height = '24px'; });
}

/** The block you are in right now, and what you committed to it. */
function seasonCard() {
  const slot = currentSlot();
  const season = seasonById(store.data.seasons?.[slot.id] ?? '');
  const left = daysBetween(new Date(), nextEnd(slot));

  if (!season) {
    return `<div class="card card-pad-lg">
      <div class="card-head"><h3>${esc(slot.name)}</h3><a class="card-link" href="seasons.html">Seasons →</a></div>
      <p class="muted" style="font-size:.86rem">No season picked for this block.
        ${left} day${left === 1 ? '' : 's'} of it left.</p>
      <a class="btn btn-sm btn-block" href="seasons.html" style="margin-top:12px">${icon('plus')}<span>Pick a season</span></a>
    </div>`;
  }

  const pctDone = Math.round(slotProgress(slot) * 100);
  return `<div class="card card-pad-lg glow-edge" style="--season:${season.accent};--glow-color:${season.accent}">
    <div class="card-head">
      <h3 class="row" style="gap:7px"><i class="glow-dot" style="--glow-color:${season.accent}"></i>This block</h3>
      <a class="card-link" href="seasons.html">Seasons →</a>
    </div>
    <div class="row" style="gap:13px;align-items:center">
      <span class="season-art" style="--season:${season.accent}">${seasonIcon(season)}</span>
      <div class="grow" style="min-width:0">
        <strong style="font-family:var(--font-display);font-size:1.05rem">${esc(season.name)}</strong>
        <p class="dim" style="font-size:.76rem;margin-top:2px">${esc(season.goal)}</p>
      </div>
    </div>
    <div class="bar" style="margin-top:14px">
      <i style="width:${pctDone}%;background:linear-gradient(90deg,${season.accent},${season.accent2})"></i>
    </div>
    <p class="dim" style="font-size:.72rem;margin-top:7px">
      ${esc(formatWindow(slot))} · ${left} day${left === 1 ? '' : 's'} to go</p>
  </div>`;
}

/**
 * The next checkpoint, and how the last one went.
 *
 * Deliberately shows the estimate's confidence rather than hiding it. A target
 * built from eleven days of half-logged food is a guess, and presenting it with
 * the same certainty as one built from six weeks would be dishonest.
 */
function checkpointCard(plan) {
  const { next, last, maintenance, ratePerWeek } = plan;

  if (!plan.checkpoints.length) {
    return `<div class="card card-pad-lg">
      <div class="card-head"><h3>Checkpoints</h3><a class="card-link" href="progress.html">Progress →</a></div>
      <p class="muted" style="font-size:.86rem">
        Log a weigh-in and FEROX starts setting fortnightly weight checkpoints, adjusted
        to what your own data says about your metabolism.</p>
    </div>`;
  }

  const dots = ['low', 'fair', 'good'].map(l =>
    `<i class="${['low', 'fair', 'good'].indexOf(maintenance.confidence) >= ['low', 'fair', 'good'].indexOf(l) ? 'on' : ''}"></i>`).join('');
  const dir = ratePerWeek === 0 ? 'hold' : ratePerWeek > 0 ? 'gain' : 'lose';
  const perWeek = Math.abs(ratePerWeek).toFixed(2);

  return `<div class="card card-pad-lg">
    <div class="card-head"><h3>Next checkpoint</h3><a class="card-link" href="progress.html">All →</a></div>

    ${next ? `<div class="checkpoint checkpoint-next is-pending">
      <span class="checkpoint-dot"></span>
      <div class="grow" style="min-width:0">
        <strong style="font-size:.9rem">${next.targetKg.toFixed(1)} kg</strong>
        <p class="dim" style="font-size:.74rem;margin-top:2px">by ${esc(next.date)}</p>
      </div>
      <span class="chip num">${relDate(next.date) === 'Today' ? 'today' : `${Math.max(0, Math.round((Date.parse(next.date) - Date.now()) / 864e5))}d`}</span>
    </div>` : ''}

    <p class="dim" style="font-size:.76rem;margin-top:10px">
      ${dir === 'hold'
        ? 'Holding steady at your current calories.'
        : `On plan you ${dir} about ${perWeek} kg a week.`}
    </p>

    ${last ? `<div class="row-between" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
      <span class="muted" style="font-size:.8rem">Last checkpoint</span>
      <span class="chip ${last.status === 'on-track' ? 'chip-ok' : last.status === 'behind' ? 'chip-warn' : 'chip-ember'}">
        ${last.status === 'on-track' ? 'On track' : last.status === 'ahead' ? `${Math.abs(last.deltaKg)} kg ahead` : `${Math.abs(last.deltaKg)} kg behind`}
      </span>
    </div>` : ''}

    <div class="row-between" style="margin-top:10px">
      <span class="muted" style="font-size:.8rem">Measured maintenance</span>
      <span class="row" style="gap:8px">
        <span class="num" style="font-size:.84rem">${num(maintenance.kcal)}</span>
        <span class="confidence" title="Confidence: ${esc(maintenance.confidence)} — ${esc(maintenance.label)}">${dots}</span>
      </span>
    </div>
    <p class="dim" style="font-size:.72rem;margin-top:6px">${esc(planHeadline(plan))}</p>
  </div>`;
}

function tile(label, value, unit, note, ico, live = false) {
  return `<div class="card${live ? ' tile-live' : ''}">
    <div class="row-between" style="align-items:flex-start">
      <div class="stat">
        <span class="stat-label">${esc(label)}</span>
        <span class="stat-value">${esc(value)}<span class="stat-unit">${esc(unit)}</span></span>
        <span class="dim" style="font-size:.76rem">${esc(note)}</span>
      </div>
      <span class="tile-ico" style="color:var(--ember);opacity:${live ? 1 : .7};width:20px;border-radius:var(--r-pill)">${icon(ico)}</span>
    </div>
  </div>`;
}

function macroBar(label, value, target, color) {
  const p = pct(value, target);
  return `<div>
    <div class="row-between" style="margin-bottom:5px">
      <span style="font-size:.82rem;font-weight:600">${esc(label)}</span>
      <span class="dim num" style="font-size:.78rem">${Math.round(value)} / ${target} g</span>
    </div>
    <div class="bar"><i style="width:${Math.min(100, p)}%;background:${color}"></i></div>
  </div>`;
}
