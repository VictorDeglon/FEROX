/** Progress — volume, body composition, consistency, focus and checkpoints. */
import { store } from '../core/store.js';
import { fmtWeight, weight as toDisplay, weightLabel } from '../core/units.js';
import { bootPage, esc, num, toast, relDate } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { lineChart, barChart, heatmap, breakdown, VIZ } from '../core/chart.js';
import { weighInFlow, MEASURES } from './_weighin.js';
import { planStatus } from '../core/plan.js';
import { weightTrend, describeFactor } from '../core/metabolism.js';

let range = 30;

const view = await bootPage({
  title: 'Progress',
  actions: `<button class="btn btn-primary btn-sm" id="wBtn">${icon('scale')}<span>Weigh in</span></button>`,
}, render);

document.getElementById('wBtn').addEventListener('click', () => weighInFlow());

function render(el) {
  const d = store.data;
  const U = store.unit;
  const s = store.stats();
  const weights = d.weights;
  const first = weights[0], last = weights.at(-1);
  const delta = first && last ? last.kg - first.kg : 0;

  const activity = new Map();
  for (const sess of d.sessions) activity.set(sess.date, (activity.get(sess.date) ?? 0) + 1);

  const avgSession = s.sessions ? s.minutes / s.sessions : 0;
  const trend = weightTrend(weights.map(w => ({ date: w.date, value: w.kg })));
  const plan = planStatus(d);

  el.innerHTML = `
    <section class="grid grid-4">
      ${stat('Total volume', num(toDisplay(s.volume, U, { decimals: 0 })), weightLabel(U), `${s.sessions} sessions`)}
      ${stat('Time trained', num(Math.round(s.minutes / 60)), 'hrs', `~${Math.round(avgSession)} min / session`)}
      ${stat('Best streak', s.bestStreak, 'days', s.streak ? `${s.streak} running now` : 'Not running')}
      ${stat('Bodyweight', last ? toDisplay(last.kg, U) : '—', last ? weightLabel(U) : '',
             delta ? `${delta > 0 ? '+' : ''}${toDisplay(delta, U)} ${weightLabel(U)} since start` : 'Log one to start')}
    </section>

    <div class="row-between wrap" style="gap:12px">
      <h2 style="font-size:1.1rem">Trends</h2>
      <div class="seg">
        ${[14, 30, 90].map(n => `<button data-range="${n}" aria-pressed="${range === n}">${n} days</button>`).join('')}
      </div>
    </div>

    <section class="grid grid-2">
      <div class="card card-pad-lg">
        <div class="card-head"><h3>Training volume</h3><span class="chip num">${num(toDisplay(store.volumeSeries(range).reduce((t, p) => t + p.value, 0), U, { decimals: 0 }))} ${weightLabel(U)}</span></div>
        ${barChart(store.volumeSeries(range), { height: 180, label: 'Volume per day', fmt: v => `${num(toDisplay(v, U, { decimals: 0 }))} ${weightLabel(U)}` })}
        <p class="dim" style="font-size:.75rem;margin-top:10px">Reps × weight, summed per day. Gaps are rest days.</p>
      </div>

      <div class="card card-pad-lg">
        <div class="card-head">
          <h3>Bodyweight</h3>
          ${trend ? `<span class="chip ${trend.perWeek < 0 ? 'chip-ok' : trend.perWeek > 0 ? 'chip-warn' : ''}">
            ${trend.perWeek > 0 ? '+' : ''}${toDisplay(trend.perWeek, U, { decimals: U === 'lb' ? 1 : 2 })} ${weightLabel(U)} / week</span>` : ''}
        </div>
        ${weights.length > 1
          ? lineChart(weights.map(w => ({ date: w.date, value: w.kg })), {
              height: 180, label: 'Bodyweight', fmt: v => fmtWeight(v, U),
              // The dashed line is the regression: bodyweight swings a kilo on
              // water alone, and the slope is the only part worth reading.
              trend: trend ? { start: trend.fitted(0), end: trend.fitted(trend.spanDays) } : null,
            })
          : `<div class="empty" style="padding:44px 12px">${icon('scale')}<strong>No weigh-ins yet</strong>
             <button class="btn btn-sm" id="w2">Log your weight</button></div>`}
        ${trend ? `<p class="dim" style="font-size:.75rem;margin-top:10px">
          Solid is what the scale said. Dashed is the trend through ${trend.points} weigh-ins
          over ${trend.spanDays} days — that is the line to judge a plan by.</p>` : ''}
      </div>

      <div class="card card-pad-lg">
        <div class="card-head"><h3>Calories</h3><span class="chip num">${store.macroHitDays()} days on target</span></div>
        ${barChart(store.kcalSeries(Math.min(range, 30)), { height: 180, label: 'Daily calories', target: d.profile.goals.kcal, fmt: v => `${num(v)} kcal` })}
      </div>

      <div class="card card-pad-lg">
        <div class="card-head"><h3>Training focus</h3><span class="chip">by sets</span></div>
        ${breakdown(store.muscleSplit(), { fmt: v => `${num(v)} sets` })}
      </div>
    </section>

    <div class="card card-pad-lg">
      <div class="card-head"><h3>Consistency</h3><span class="chip">${activity.size} active days</span></div>
      ${heatmap(activity, { weeks: 26, label: 'Training days' })}
      <p class="dim" style="font-size:.75rem;margin-top:10px">Last 26 weeks.</p>
    </div>

    <div class="row-between wrap" style="gap:12px">
      <h2 style="font-size:1.1rem">Body composition</h2>
      <button class="btn btn-sm" id="wBtn2">${icon('plus')}<span>Weigh in</span></button>
    </div>
    ${compositionSection(d)}

    <h2 style="font-size:1.1rem">Checkpoints</h2>
    ${checkpointSection(plan, d)}

    ${d.checkIns.length ? `<div class="card card-pad-lg">
      <div class="card-head">
        <h3>Weigh-in log</h3>
        <span class="chip num">${d.checkIns.length} logged</span>
      </div>
      <div class="table-wrap"><table class="data">
        <thead><tr>
          <th>Date</th>
          <th style="text-align:right">Weight</th>
          <th style="text-align:right">Change</th>
          ${MEASURES.filter(m => d.checkIns.some(c => c[m.key]))
            .map(m => `<th style="text-align:right">${esc(m.label)}</th>`).join('')}
          <th></th>
        </tr></thead>
        <tbody>${[...d.checkIns].reverse().slice(0, 25).map((c, i, arr) => {
          const prev = arr[i + 1];
          // A genuine "no change" and "nothing to compare to" must not look the
          // same: only the second one is a dash.
          const comparable = prev?.weightKg > 0 && c.weightKg > 0;
          const diff = comparable ? c.weightKg - prev.weightKg : null;
          return `<tr>
            <td class="dim">${esc(c.date)}${c.note ? ` <span title="${esc(c.note)}">·</span>` : ''}</td>
            <td style="text-align:right" class="num">${fmtWeight(c.weightKg, U)}</td>
            <td style="text-align:right" class="num ${diff < 0 ? 'stat-delta up' : diff > 0 ? 'stat-delta down' : 'dim'}">
              ${comparable ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}</td>
            ${MEASURES.filter(m => d.checkIns.some(x => x[m.key]))
              .map(m => `<td style="text-align:right" class="num dim">${c[m.key] ?? '—'}</td>`).join('')}
            <td style="text-align:right">
              <button class="btn btn-ghost btn-sm" data-rmci="${esc(c.id)}"
                aria-label="Delete the check-in from ${esc(c.date)}">${icon('trash')}</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>` : ''}`;

  el.querySelectorAll('[data-range]').forEach(b =>
    b.addEventListener('click', () => { range = +b.dataset.range; render(el); }));
  el.querySelector('#w2')?.addEventListener('click', () => weighInFlow());
  el.querySelector('#wBtn2')?.addEventListener('click', () => weighInFlow());
  el.querySelectorAll('[data-rmci]').forEach(b => b.addEventListener('click', async () => {
    await store.removeCheckIn(b.dataset.rmci);
    toast('Check-in removed');
  }));

  el.querySelector('#applyAdj')?.addEventListener('click', async () => {
    const adj = plan.adjustment;
    if (!adj) return;
    // Calories move; protein does not. Carbs absorb the change, because fat is
    // pinned to a share of calories and protein is pinned to bodyweight.
    const g = store.data.profile.goals;
    const fat = Math.round((adj.kcal * 0.25) / 9);
    await store.updateProfile({
      goals: {
        ...g, kcal: adj.kcal, fat,
        carbs: Math.max(0, Math.round((adj.kcal - g.protein * 4 - fat * 9) / 4)),
      },
    });
    toast(`Target now ${num(adj.kcal)} kcal`, 'ok');
  });
}

/**
 * One chart per measure anyone has actually recorded.
 *
 * Nothing is rendered for a measure with no data — an empty "Body fat" card is
 * a reproach rather than information, and the whole point of the optional
 * fields is that skipping them is a legitimate choice.
 */
function compositionSection(d) {
  const cards = [
    { key: 'weightKg',  label: 'Weight',      unit: 'kg',  color: VIZ[0], good: 'either' },
    { key: 'bodyFat',   label: 'Body fat',    unit: '%',   color: VIZ[3], good: 'down' },
    { key: 'leanKg',    label: 'Lean mass',   unit: 'kg',  color: VIZ[4], good: 'up' },
    { key: 'waistCm',   label: 'Waist',       unit: 'cm',  color: VIZ[1], good: 'down' },
    { key: 'restingHr', label: 'Resting HR',  unit: 'bpm', color: VIZ[5], good: 'down' },
    { key: 'sleepH',    label: 'Sleep',       unit: 'hrs', color: VIZ[2], good: 'up' },
  ].map(m => ({ ...m, series: store.measureSeries(m.key) })).filter(m => m.series.length);

  if (!cards.length) {
    return `<div class="card card-pad-lg">
      <div class="empty" style="padding:38px 12px">
        ${icon('scale')}<strong>Nothing measured yet</strong>
        <p style="font-size:.85rem;max-width:44ch">
          Weigh-ins take body fat, lean mass, waist, resting heart rate and sleep as well
          as a weight. Every one of them is optional, and each one that has data gets a chart here.</p>
      </div></div>`;
  }

  return `<section class="grid grid-2">${cards.map(m => {
    const first = m.series[0].value, latest = m.series.at(-1).value;
    const change = latest - first;
    // "Good" depends on the measure: falling body fat is progress, falling
    // lean mass is not, and a weight can be either depending on the season.
    const tone = m.good === 'either' || !change ? ''
      : (change < 0) === (m.good === 'down') ? 'chip-ok' : 'chip-warn';
    return `<div class="card card-pad-lg">
      <div class="card-head">
        <h3>${esc(m.label)}</h3>
        <div class="row" style="gap:8px">
          <span class="chip num">${latest.toFixed(1)} ${esc(m.unit)}</span>
          ${m.series.length > 1 ? `<span class="chip ${tone} num">${change > 0 ? '+' : ''}${change.toFixed(1)}</span>` : ''}
        </div>
      </div>
      ${lineChart(m.series, {
        height: 150, label: m.label, color: m.color,
        fmt: v => `${v} ${m.unit}`,
      })}
      <p class="dim" style="font-size:.74rem;margin-top:9px">
        ${m.series.length} reading${m.series.length === 1 ? '' : 's'} since ${esc(m.series[0].date)}</p>
    </div>`;
  }).join('')}</section>`;
}

/**
 * The checkpoint timeline, plus what the log says about maintenance.
 *
 * The targets are recomputed on every render rather than frozen when they were
 * set — a goal derived six weeks ago from a metabolism estimate that has since
 * been corrected should not still be the goal.
 */
function checkpointSection(plan, d) {
  const { maintenance, adherence: a, checkpoints: marks, adjustment, ratePerWeek } = plan;

  const estimate = `<div class="card card-pad-lg">
    <div class="card-head">
      <h3>What your data says</h3>
      <span class="chip ${maintenance.confidence === 'good' ? 'chip-ok' : maintenance.confidence === 'none' ? '' : 'chip-warn'}">
        ${maintenance.confidence === 'none' ? 'Not enough data' : `${esc(maintenance.confidence)} confidence`}
      </span>
    </div>
    <div class="grid grid-3" style="gap:12px">
      ${mini('Predicted maintenance', num(plan.predicted), 'kcal')}
      ${mini('Measured maintenance', num(maintenance.kcal), 'kcal')}
      ${mini('Weight trend', `${maintenance.trendPerWeek > 0 ? '+' : ''}${maintenance.trendPerWeek.toFixed(2)}`, 'kg/wk')}
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:14px">
      ${maintenance.confidence === 'none'
        ? `The equation predicts ${num(plan.predicted)} kcal. To measure it instead, FEROX needs about
           two weeks of weigh-ins and food logged on most of those days — it has
           ${maintenance.loggedDays} logged day${maintenance.loggedDays === 1 ? '' : 's'} and
           ${maintenance.spanDays} day${maintenance.spanDays === 1 ? '' : 's'} of weigh-ins so far.`
        : `${esc(describeFactor(maintenance.factor))}. Worked out from ${num(maintenance.meanKcal)} kcal a day
           against a ${maintenance.trendPerWeek > 0 ? 'gain' : 'loss'} of
           ${toDisplay(Math.abs(maintenance.trendPerWeek), U)} ${weightLabel(U)} a week over ${maintenance.spanDays} days.`}
    </p>
    <div class="grid grid-3" style="gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">
      ${mini('Days logged', `${a.loggedDays} / ${a.days}`)}
      ${mini('On target', `${a.onTargetDays}`, 'days')}
      ${mini('Adherence', `${Math.round(a.score * 100)}`, '%')}
    </div>
    <p class="dim" style="font-size:.75rem;margin-top:10px">
      Adherence weights how often you log at all (40%) against how often a logged day
      landed within 10% of target (60%). It scales every checkpoint below — a deficit
      you keep half the time moves you at half the rate.</p>
  </div>`;

  if (!marks.length) {
    return `<section class="grid grid-2">${estimate}
      <div class="card card-pad-lg">
        <div class="card-head"><h3>Checkpoints</h3></div>
        <div class="empty" style="padding:30px 12px">${icon('target')}<strong>No checkpoints yet</strong>
          <p style="font-size:.85rem">Log one weigh-in and a fortnightly schedule of weight goals appears here.</p>
        </div>
      </div></section>`;
  }

  const every = d.settings.checkpointEvery;
  return `<section class="grid grid-2">${estimate}
    <div class="card card-pad-lg">
      <div class="card-head">
        <h3>Your schedule</h3>
        <span class="chip">every ${every} days</span>
      </div>
      <div class="stack" style="gap:8px">
        ${marks.map(c => `<div class="checkpoint is-${c.status}${c === plan.next ? ' checkpoint-next' : ''}">
          <span class="checkpoint-dot"></span>
          <div class="grow" style="min-width:0">
            <strong style="font-size:.88rem">${fmtWeight(c.targetKg, U)}</strong>
            <p class="dim" style="font-size:.73rem;margin-top:2px">
              ${esc(c.date)} · ${c.past ? relDate(c.date) : `in ${Math.max(0, Math.round((Date.parse(c.date) - Date.now()) / 864e5))} days`}
            </p>
          </div>
          ${c.actualKg != null
            ? `<span class="chip num ${c.status === 'on-track' ? 'chip-ok' : c.status === 'behind' ? 'chip-warn' : 'chip-ember'}">
                ${c.actualKg.toFixed(1)} · ${c.deltaKg > 0 ? '+' : ''}${c.deltaKg}</span>`
            : `<span class="chip dim">${c.past ? 'no weigh-in' : 'to come'}</span>`}
        </div>`).join('')}
      </div>
      <p class="dim" style="font-size:.75rem;margin-top:12px">
        ${ratePerWeek === 0
          ? 'Your calories sit at measured maintenance, so the checkpoints hold your weight steady.'
          : `Built from a ${num(Math.abs(plan.targetKcal - maintenance.kcal))} kcal
             ${plan.targetKcal > maintenance.kcal ? 'surplus' : 'deficit'}, scaled by adherence.`}
        Half a kilo either side counts as on track.</p>

      ${adjustment ? `<div class="card" style="margin-top:14px;padding:13px;background:var(--surf-2)">
        <div class="row-between wrap" style="gap:10px">
          <div style="min-width:0">
            <strong style="font-size:.86rem">Suggested: ${adjustment.delta > 0 ? '+' : ''}${adjustment.delta} kcal a day</strong>
            <p class="dim" style="font-size:.75rem;margin-top:3px">${esc(adjustment.reason)} New target ${num(adjustment.kcal)} kcal.</p>
          </div>
          <button class="btn btn-sm btn-primary" id="applyAdj">${icon('check')}<span>Apply</span></button>
        </div>
      </div>` : ''}
    </div></section>`;
}

function mini(label, value, unit = '') {
  return `<div class="stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value" style="font-size:1.18rem">${esc(value)}${unit ? `<span class="stat-unit">${esc(unit)}</span>` : ''}</span>
  </div>`;
}

function stat(label, value, unit, note) {
  return `<div class="card"><div class="stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value">${esc(value)}<span class="stat-unit">${esc(unit)}</span></span>
    <span class="dim" style="font-size:.76rem">${esc(note)}</span>
  </div></div>`;
}
