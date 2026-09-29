/** Medals — what you've earned and what's still locked. */
import { store } from '../core/store.js';
import { bootPage, esc, num, pct } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { MEDALS } from '../core/seed.js';

await bootPage({ title: 'Medals' }, render);

/** How close the athlete is to each locked medal, for the progress bars. */
function progressFor(medal, s) {
  const map = {
    'm-first':    [s.sessions, 1],      'm-ten':     [s.sessions, 10],
    'm-fifty':    [s.sessions, 50],     'm-streak3': [s.bestStreak, 3],
    'm-streak7':  [s.bestStreak, 7],    'm-streak30':[s.bestStreak, 30],
    'm-vol10k':   [s.volume, 10000],    'm-vol100k': [s.volume, 100000],
    'm-pr5':      [s.prs, 5],           'm-macro':   [s.macroDays, 7],
    'm-pack':     [s.friends, 3],       'm-early':   [s.earlyBird ? 1 : 0, 1],
  };
  return map[medal.id] ?? [0, 1];
}

function render(el) {
  const s = store.stats();
  const owned = new Set(store.data.medals);
  const earned = MEDALS.filter(m => owned.has(m.id));
  const locked = MEDALS.filter(m => !owned.has(m.id));

  el.innerHTML = `
    <div class="card card-pad-lg">
      <div class="row wrap" style="gap:26px;align-items:center">
        <div class="stat grow">
          <span class="stat-label">Collection</span>
          <span class="stat-value">${earned.length}<span class="stat-unit">/ ${MEDALS.length}</span></span>
          <span class="dim" style="font-size:.8rem">${locked.length} still to unlock</span>
        </div>
        <div style="flex:2;min-width:220px">
          <div class="bar" style="height:10px"><i style="width:${pct(earned.length, MEDALS.length)}%"></i></div>
          <p class="dim" style="font-size:.76rem;margin-top:8px">
            ${pct(earned.length, MEDALS.length)}% complete · medals unlock automatically as you train.</p>
        </div>
      </div>
    </div>

    ${earned.length ? `
      <section>
        <h2 style="font-size:1.05rem;margin-bottom:14px">Earned</h2>
        <div class="grid grid-4">${earned.map(m => tile(m, true)).join('')}</div>
      </section>` : ''}

    <section>
      <h2 style="font-size:1.05rem;margin-bottom:14px">${earned.length ? 'Locked' : 'All medals'}</h2>
      <div class="grid grid-4">${locked.map(m => tile(m, false, progressFor(m, s))).join('')}</div>
    </section>`;
}

function tile(m, earned, progress) {
  const [have, need] = progress ?? [0, 1];
  return `<article class="card medal ${earned ? 'earned' : ''}">
    <div class="medal-disc">${icon(m.icon)}</div>
    <div>
      <div class="medal-name">${esc(m.name)}</div>
      <p class="dim" style="font-size:.76rem;margin-top:3px">${esc(m.hint)}</p>
    </div>
    ${earned
      ? `<span class="chip chip-ok">${icon('check')}Earned</span>`
      : `<div style="width:100%">
          <div class="bar bar-thin"><i style="width:${Math.min(100, pct(have, need))}%"></i></div>
          <p class="dim num" style="font-size:.7rem;margin-top:6px">${num(Math.min(have, need))} / ${num(need)}</p>
        </div>`}
  </article>`;
}
