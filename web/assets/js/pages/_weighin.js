/**
 * The weigh-in.
 *
 * Asked on a schedule the athlete sets — every other day out of the box, which
 * is often enough that the trend line means something and rare enough that the
 * app is not nagging. Weight is the only required field. Everything else is
 * offered, never demanded: someone with a tape measure and no calipers should
 * be able to log a waist without being asked for a body-fat percentage they do
 * not have.
 *
 * Body fat and lean mass are two views of one fact, so entering either fills
 * the other in — and the pair is stored, because a chart of lean mass is the
 * one that tells you whether a cut is going well.
 */
import { store, todayISO } from '../core/store.js';
import { weight as toDisplay, toStoredKg, kgToLb, weightLabel, fmtWeight } from '../core/units.js';
import { esc, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { bodyFatFromLean, leanFromBodyFat } from '../core/metabolism.js';

/** The optional measures, in the order they are asked. */
export const MEASURES = [
  { key: 'bodyFat',   label: 'Body fat',   unit: '%',   min: 3,  max: 70,  step: 0.1,
    hint: 'Calipers, a smart scale or a DEXA — whatever you use, keep using the same one.' },
  { key: 'leanKg',    label: 'Lean mass',  unit: 'kg',  min: 20, max: 200, step: 0.1,
    hint: 'Fills itself in from body fat, and vice versa.' },
  { key: 'waistCm',   label: 'Waist',      unit: 'cm',  min: 40, max: 200, step: 0.5,
    hint: 'At the navel, relaxed, at the end of a normal breath out.' },
  { key: 'restingHr', label: 'Resting HR', unit: 'bpm', min: 30, max: 140, step: 1,
    hint: 'Measured before you get out of bed. It drifts up when you are under-recovered.' },
  { key: 'sleepH',    label: 'Sleep',      unit: 'hrs', min: 0,  max: 16,  step: 0.5,
    hint: 'Last night. The single best predictor of how the session will go.' },
];

const ENERGY = ['Flat', 'Low', 'Fine', 'Good', 'Flying'];

/**
 * Open the weigh-in dialog.
 * @param {{date?:string, scheduled?:boolean}} opts
 * @returns {Promise<object|null>} the check-in written, or null if dismissed.
 */
export function weighInFlow({ date = todayISO(), scheduled = false } = {}) {
  return new Promise(resolve => {
    const d = store.data;
    const existing = d.checkIns.find(c => c.date === date);
    const last = d.checkIns.filter(c => c.date !== date).at(-1);
    const seed = existing ?? {};
    const U = store.unit;
    const startWeight = seed.weightKg ?? last?.weightKg ?? d.profile.weightKg ?? 78;

    const since = last ? Math.round((Date.parse(date) - Date.parse(last.date)) / 864e5) : null;
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.innerHTML = `
      <form class="card card-pad-lg stack" style="gap:16px">
        <div class="row-between">
          <div>
            <p class="eyebrow" style="color:var(--ember)">${scheduled ? 'Weigh-in due' : 'Weigh-in'}</p>
            <h3 style="font-size:var(--step-2);margin-top:5px">${existing ? 'Update' : 'Where are you at?'}</h3>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
        </div>

        <p class="muted" style="font-size:var(--step--1);margin-top:-6px">
          ${last
            ? `Last one ${since === 0 ? 'earlier today' : since === 1 ? 'yesterday' : `${since} days ago`} at ${fmtWeight(last.weightKg, U)}.`
            : 'Your first one. Weigh in at the same time of day from now on — first thing, after the bathroom, before food — or the trend is noise.'}
        </p>

        <div class="field-row">
          <div class="field">
            <label for="wiWeight">Weight (${weightLabel(U)}) <span style="color:var(--ember)">*</span></label>
            <input class="input" id="wiWeight" name="weightKg" type="number"
              step="${U === 'lb' ? 0.5 : 0.1}" min="${U === 'lb' ? 55 : 25}" max="${U === 'lb' ? 880 : 400}"
              value="${toDisplay(startWeight, U)}" required inputmode="decimal">
          </div>
          <div class="field">
            <label for="wiDate">Date</label>
            <input class="input" id="wiDate" name="date" type="date" value="${esc(date)}" max="${todayISO()}">
          </div>
        </div>

        <details class="wi-more"${existing && MEASURES.some(m => existing[m.key]) ? ' open' : ''}>
          <summary class="card-link" style="cursor:pointer;font-size:var(--step--1)">
            More measurements — all optional
          </summary>
          <div class="stack" style="gap:12px;margin-top:12px">
            <div class="field-row">
              ${MEASURES.slice(0, 2).map(m => measureField(m, seed, U)).join('')}
            </div>
            <p class="dim" style="font-size:var(--step--2);margin-top:-6px">
              Enter either one and the other is worked out for you.</p>
            <div class="field-row">
              ${MEASURES.slice(2, 4).map(m => measureField(m, seed, U)).join('')}
            </div>
            <div class="field-row">
              ${measureField(MEASURES[4], seed, U)}
              <div class="field">
                <label for="wiHeight">Height (${U === 'lb' ? 'in' : 'cm'})</label>
                <input class="input" id="wiHeight" name="heightCm" type="number"
                  min="${U === 'lb' ? 39 : 100}" max="${U === 'lb' ? 98 : 250}" step="${U === 'lb' ? 0.5 : 1}"
                  value="${d.profile.heightCm ? (U === 'lb' ? Math.round(d.profile.heightCm / 2.54 * 2) / 2 : d.profile.heightCm) : ''}"
                  placeholder="unchanged">
              </div>
            </div>
            <div class="field">
              <label for="wiEnergy">How do you feel overall?</label>
              <select class="select" id="wiEnergy" name="energy">
                <option value="">Not saying</option>
                ${ENERGY.map((label, i) =>
                  `<option value="${i + 1}"${+seed.energy === i + 1 ? ' selected' : ''}>${label}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="wiNote">Note</label>
              <input class="input" id="wiNote" name="note" maxlength="140"
                value="${esc(seed.note ?? '')}" placeholder="Travelling, ill, big weekend — anything that explains the number">
            </div>
          </div>
        </details>

        <div class="row wrap" style="justify-content:flex-end;gap:10px">
          ${scheduled ? `<button type="button" class="btn btn-ghost btn-sm" data-snooze>Not today</button>` : ''}
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${icon('check')}<span>Save</span></button>
        </div>
      </form>`;

    /* Body fat and lean mass keep each other honest, in whichever direction
       the athlete happens to type. Neither overwrites a field being edited. */
    const weight = dlg.querySelector('#wiWeight');
    const bf = dlg.querySelector('#wi-bodyFat');
    const lean = dlg.querySelector('#wi-leanKg');
    const round1 = v => (v == null ? '' : String(Math.round(v * 10) / 10));

    bf.addEventListener('input', () => {
      if (document.activeElement !== bf) return;
      lean.value = round1(leanFromBodyFat(+weight.value, +bf.value));
    });
    lean.addEventListener('input', () => {
      if (document.activeElement !== lean) return;
      bf.value = round1(bodyFatFromLean(+weight.value, +lean.value));
    });
    weight.addEventListener('input', () => {
      // Whichever of the pair was filled in is the one held fixed.
      if (bf.value) lean.value = round1(leanFromBodyFat(+weight.value, +bf.value));
      else if (lean.value) bf.value = round1(bodyFatFromLean(+weight.value, +lean.value));
    });

    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); dlg.close(); dlg.remove(); };

    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', async () => {
      if (scheduled) await store.noteWeighInPrompt();
      finish(null);
    }));
    dlg.addEventListener('cancel', async e => {
      e.preventDefault();
      if (scheduled) await store.noteWeighInPrompt();
      finish(null);
    });
    dlg.querySelector('[data-snooze]')?.addEventListener('click', async () => {
      await store.noteWeighInPrompt();
      toast('Fine — asking again tomorrow');
      finish(null);
    });

    dlg.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const U = store.unit;
      // Typed in whatever the athlete reads; stored in kilograms, always.
      const kgIn = toStoredKg(f.weightKg, U) ?? 0;
      if (!Number.isFinite(kgIn) || kgIn <= 0) { toast('A weight is the one thing we need', 'bad'); return; }

      const rec = await store.logCheckIn({
        date: f.date || date,
        weightKg: kgIn,
        bodyFat: +f.bodyFat || undefined,
        leanKg: measureIn('leanKg', +f.leanKg || undefined, U),
        waistCm: measureIn('waistCm', +f.waistCm || undefined, U),
        restingHr: +f.restingHr || undefined,
        sleepH: +f.sleepH || undefined,
        energy: +f.energy || undefined,
        heightCm: (+f.heightCm || undefined) == null ? undefined
          : U === 'lb' ? (+f.heightCm || 0) * 2.54 || undefined : +f.heightCm || undefined,
        note: (f.note ?? '').trim() || undefined,
      });

      const prev = store.data.checkIns.filter(c => c.date < rec.date).at(-1);
      const move = prev?.weightKg ? rec.weightKg - prev.weightKg : 0;
      toast(move
        ? `Logged ${fmtWeight(rec.weightKg, U)} — ${move > 0 ? '+' : ''}${toDisplay(move, U)} ${weightLabel(U)} since ${prev.date}`
        : `Logged ${fmtWeight(rec.weightKg, U)}`, 'ok');
      finish(rec);
    });

    document.body.append(dlg);
    dlg.showModal();
    weight.focus();
    weight.select();
  });
}

/**
 * Lean mass is a weight and the waist is a length, so both follow the
 * athlete's system. Body fat, heart rate, sleep and energy are percentages,
 * beats and hours — the same number everywhere on earth.
 */
const IMPERIALISED = { leanKg: 'weight', waistCm: 'length' };

/** Metric value -> what the athlete types. */
export const measureOut = (key, v, unit) => {
  if (v == null || unit !== 'lb' || !IMPERIALISED[key]) return v;
  return Math.round((IMPERIALISED[key] === 'weight' ? kgToLb(v) : v / 2.54) * 10) / 10;
};
/** What the athlete typed -> what gets stored. */
export const measureIn = (key, v, unit) => {
  if (v == null || unit !== 'lb' || !IMPERIALISED[key]) return v;
  return IMPERIALISED[key] === 'weight'
    ? toStoredKg(v, 'lb')
    : Math.round(v * 2.54 * 10) / 10;
};

function measureField({ key, label, unit, min, max, step, hint }, seed, u = 'kg') {
  const imp = u === 'lb' && IMPERIALISED[key];
  const shown = imp ? (IMPERIALISED[key] === 'weight' ? 'lb' : 'in') : unit;
  const lo = imp ? Math.round(measureOut(key, min, u)) : min;
  const hi = imp ? Math.round(measureOut(key, max, u)) : max;
  return `<div class="field">
    <label for="wi-${key}">${esc(label)} (${esc(shown)})</label>
    <input class="input" id="wi-${key}" name="${key}" type="number"
      min="${lo}" max="${hi}" step="${step}" inputmode="decimal"
      value="${measureOut(key, seed[key], u) ?? ''}" placeholder="—" title="${esc(hint)}">
  </div>`;
}

/**
 * Ask, if it is due. Called from the dashboard once the page has settled, so
 * the prompt never lands on top of a loading skeleton.
 */
export async function maybeAskWeighIn() {
  const { due } = store.weighInDue();
  if (!due) return null;
  return weighInFlow({ scheduled: true });
}

/** The strip on the dashboard — always there, whether or not one is due. */
export function weighInBar(onChange) {
  const { due, days } = store.weighInDue();
  const last = store.data.checkIns.at(-1);
  const every = store.data.settings.weighInEvery;

  const el = document.createElement('div');
  el.className = `card${due ? ' tile-live' : ''}`;
  el.style.cssText = 'padding:13px 16px';
  el.innerHTML = `
    <div class="row-between wrap" style="gap:12px">
      <div class="row" style="gap:12px;min-width:0">
        <span style="color:var(--ember);width:18px;flex:none">${icon('scale')}</span>
        <div style="min-width:0">
          <strong style="font-size:var(--step--1)">
            ${due ? 'Weigh-in due' : last ? fmtWeight(last.weightKg, store.unit) : 'No weigh-ins yet'}</strong>
          <p class="dim" style="font-size:var(--step--2);margin-top:2px">
            ${last
              ? `Last logged ${esc(last.date)}${days != null && !due ? ` · next in ${Math.max(0, every - days)} day${every - days === 1 ? '' : 's'}` : ''}`
              : every ? `Asked every ${every === 1 ? 'day' : `${every} days`} — change it in your profile` : 'Prompts are off'}
          </p>
        </div>
      </div>
      <button class="ready-chip" data-log>${icon(due ? 'plus' : 'settings')}<span>${due ? 'Log it' : 'Log a weigh-in'}</span></button>
    </div>`;

  el.querySelector('[data-log]').addEventListener('click', async () => {
    const rec = await weighInFlow();
    if (rec) onChange?.(rec);
  });
  return el;
}
