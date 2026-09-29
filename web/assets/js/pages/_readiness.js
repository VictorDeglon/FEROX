/**
 * The daily check-in.
 *
 * Asked once a day, before training. The point is not the data — it is that
 * scaling a session beats skipping one. Someone who trains at 60% on a bad day
 * keeps the habit; someone who sees a session they cannot face closes the app.
 */
import { store } from '../core/store.js';
import { esc, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { readinessFor, READINESS } from '../core/split.js';

const FACES = ['😵', '😩', '😫', '😕', '😐', '🙂', '😊', '😃', '😤', '🔥'];

/** Ask how today feels. Resolves to the score, or null if dismissed. */
export function askReadiness({ force = false } = {}) {
  return new Promise(resolve => {
    const existing = store.readinessFor();
    if (existing && !force) return resolve(existing);

    let score = existing ?? 7;
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.innerHTML = `<div class="card card-pad-lg stack" style="gap:var(--sp-s);text-align:center">
      <div>
        <p class="eyebrow">Before you start</p>
        <h3 style="font-size:var(--step-2);margin-top:6px">How are you feeling today?</h3>
        <p class="muted" style="font-size:var(--step--1);margin-top:6px">
          We scale the session to match. Training lighter beats not training.</p>
      </div>

      <div class="ready-face" id="face">${FACES[score - 1]}</div>
      <div>
        <div class="slider-head" style="justify-content:center">
          <span class="slider-value" id="lbl">${esc(readinessFor(score).label)}</span>
        </div>
        <input type="range" class="slider" id="rs" min="1" max="10" value="${score}"
          style="--pct:${((score - 1) / 9) * 100}%" aria-label="How you feel today, 1 to 10">
        <div class="slider-scale"><span>Wrecked</span><span>Primed</span></div>
      </div>
      <p class="slider-caption" id="cap" style="min-height:2.8em">${esc(readinessFor(score).note)}</p>

      <div class="row" style="gap:10px">
        <button class="btn btn-ghost grow" data-skip>Skip</button>
        <button class="btn btn-primary grow" data-ok>${icon('check')}<span>Set it</span></button>
      </div>
    </div>`;

    const rs = dlg.querySelector('#rs');
    const sync = () => {
      score = +rs.value;
      const r = readinessFor(score);
      rs.style.setProperty('--pct', `${((score - 1) / 9) * 100}%`);
      dlg.querySelector('#face').textContent = FACES[score - 1];
      dlg.querySelector('#lbl').textContent = r.label;
      dlg.querySelector('#cap').textContent = r.note;
    };
    rs.addEventListener('input', sync);

    const close = v => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.querySelector('[data-skip]').addEventListener('click', () => close(null));
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    dlg.querySelector('[data-ok]').addEventListener('click', async () => {
      await store.setReadiness(score);
      close(score);
    });

    document.body.append(dlg);
    dlg.showModal();
  });
}

/** The always-visible strip at the top of the workout, so it can be changed. */
export function readinessBar(onChange) {
  const score = store.readinessFor();
  const r = score ? readinessFor(score) : null;

  const el = document.createElement('div');
  el.className = 'card';
  el.style.cssText = 'padding:13px 16px';
  el.innerHTML = score
    ? `<div class="row-between wrap" style="gap:12px">
        <div class="row" style="gap:12px;min-width:0">
          <span style="font-size:1.6rem;line-height:1">${FACES[score - 1]}</span>
          <div style="min-width:0">
            <strong style="font-size:var(--step--1)">Feeling ${esc(r.label.toLowerCase())} — ${score}/10</strong>
            <p class="dim" style="font-size:var(--step--2);margin-top:2px">${esc(r.note)}</p>
          </div>
        </div>
        <button class="ready-chip" data-change>${icon('settings')}<span>Change</span></button>
      </div>`
    : `<div class="row-between wrap" style="gap:12px">
        <div class="row" style="gap:10px">
          <span style="color:var(--ember);width:18px">${icon('heart')}</span>
          <strong style="font-size:var(--step--1)">How are you feeling today?</strong>
        </div>
        <button class="ready-chip" data-change>Set it</button>
      </div>`;

  el.querySelector('[data-change]').addEventListener('click', async () => {
    const v = await askReadiness({ force: true });
    if (v) { toast(`Session scaled to ${readinessFor(v).label.toLowerCase()}`, 'ok'); onChange?.(v); }
  });
  return el;
}

export { READINESS, FACES };
