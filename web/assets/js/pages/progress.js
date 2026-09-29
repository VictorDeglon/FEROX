/** Progress — volume, bodyweight, consistency and training focus. */
import { store, todayISO } from '../core/store.js';
import { bootPage, esc, num, kg, toast, modal } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { lineChart, barChart, heatmap, breakdown } from '../core/chart.js';

let range = 30;

const view = await bootPage({
  title: 'Progress',
  actions: `<button class="btn btn-primary btn-sm" id="wBtn">${icon('scale')}<span>Log weight</span></button>`,
}, render);

document.getElementById('wBtn').addEventListener('click', logWeightFlow);

function render(el) {
  const d = store.data;
  const s = store.stats();
  const weights = d.weights;
  const first = weights[0], last = weights.at(-1);
  const delta = first && last ? last.kg - first.kg : 0;

  const activity = new Map();
  for (const sess of d.sessions) activity.set(sess.date, (activity.get(sess.date) ?? 0) + 1);

  const avgSession = s.sessions ? s.minutes / s.sessions : 0;

  el.innerHTML = `
    <section class="grid grid-4">
      ${stat('Total volume', num(s.volume), 'kg', `${s.sessions} sessions`)}
      ${stat('Time trained', num(Math.round(s.minutes / 60)), 'hrs', `~${Math.round(avgSession)} min / session`)}
      ${stat('Best streak', s.bestStreak, 'days', s.streak ? `${s.streak} running now` : 'Not running')}
      ${stat('Bodyweight', last ? last.kg.toFixed(1) : '—', last ? 'kg' : '',
             delta ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg since start` : 'Log one to start')}
    </section>

    <div class="row-between wrap" style="gap:12px">
      <h2 style="font-size:1.1rem">Trends</h2>
      <div class="seg">
        ${[14, 30, 90].map(n => `<button data-range="${n}" aria-pressed="${range === n}">${n} days</button>`).join('')}
      </div>
    </div>

    <section class="grid grid-2">
      <div class="card card-pad-lg">
        <div class="card-head"><h3>Training volume</h3><span class="chip num">${num(store.volumeSeries(range).reduce((t, p) => t + p.value, 0))} kg</span></div>
        ${barChart(store.volumeSeries(range), { height: 180, label: 'Volume per day', fmt: v => `${num(v)} kg` })}
        <p class="dim" style="font-size:.75rem;margin-top:10px">Reps × weight, summed per day. Gaps are rest days.</p>
      </div>

      <div class="card card-pad-lg">
        <div class="card-head">
          <h3>Bodyweight</h3>
          ${last ? `<span class="chip ${delta < 0 ? 'chip-ok' : delta > 0 ? 'chip-warn' : ''}">${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg</span>` : ''}
        </div>
        ${weights.length > 1
          ? lineChart(weights.map(w => ({ date: w.date, value: w.kg })), { height: 180, label: 'Bodyweight', fmt: v => `${v} kg` })
          : `<div class="empty" style="padding:44px 12px">${icon('scale')}<strong>No weigh-ins yet</strong>
             <button class="btn btn-sm" id="w2">Log your weight</button></div>`}
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

    ${weights.length ? `<div class="card card-pad-lg">
      <div class="card-head"><h3>Weigh-in log</h3></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Date</th><th style="text-align:right">Weight</th><th style="text-align:right">Change</th></tr></thead>
        <tbody>${[...weights].reverse().slice(0, 20).map((w, i, arr) => {
          const prev = arr[i + 1];
          const diff = prev ? w.kg - prev.kg : 0;
          return `<tr><td class="dim">${w.date}</td><td style="text-align:right" class="num">${w.kg.toFixed(1)} kg</td>
            <td style="text-align:right" class="num ${diff < 0 ? 'stat-delta up' : diff > 0 ? 'stat-delta down' : 'dim'}">
              ${prev ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}</td></tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>` : ''}`;

  el.querySelectorAll('[data-range]').forEach(b =>
    b.addEventListener('click', () => { range = +b.dataset.range; render(el); }));
  el.querySelector('#w2')?.addEventListener('click', logWeightFlow);
}

function stat(label, value, unit, note) {
  return `<div class="card"><div class="stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value">${esc(value)}<span class="stat-unit">${esc(unit)}</span></span>
    <span class="dim" style="font-size:.76rem">${esc(note)}</span>
  </div></div>`;
}

async function logWeightFlow() {
  const last = store.data.weights.at(-1);
  const res = await modal({
    title: 'Log bodyweight',
    submit: 'Save',
    body: `
      <div class="field-row">
        <div class="field">
          <label for="kgIn">Weight (kg)</label>
          <input class="input" id="kgIn" name="kg" type="number" step="0.1" min="20" max="400"
            value="${last?.kg ?? 80}" required>
        </div>
        <div class="field">
          <label for="dIn">Date</label>
          <input class="input" id="dIn" name="date" type="date" value="${todayISO()}" max="${todayISO()}">
        </div>
      </div>
      <p class="dim" style="font-size:.78rem">Weigh in at the same time of day — first thing, after the bathroom, before food — or the trend line is noise.</p>`,
  });
  if (!res) return;
  await store.logWeight(+res.kg, res.date || todayISO());
  toast('Weight logged', 'ok');
}
