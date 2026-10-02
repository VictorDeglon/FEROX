/**
 * The "log a session" flow, shared by the dashboard and the workouts page.
 * A live set editor: pick exercises, fill reps x weight, save.
 */
import { store, todayISO } from '../core/store.js';
import { weight as toDisplay, toStoredKg, weightLabel, roundToPlates } from '../core/units.js';
import { esc, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { EXERCISES, ROUTINES, MEDALS, byId } from '../core/seed.js';
import { suggestLoad } from '../core/strength.js';
import { mountCatalog } from './_catalog.js';

/**
 * What goes after the number. A loaded lift follows the athlete's preference;
 * seconds and kilometres are the exercise's own and never convert.
 */
const unitLabel = (ex, unit) =>
  (ex.unit === 'kg' ? weightLabel(unit) : ({ bw: 'body', sec: 'sec', km: 'km' }[ex.unit] ?? ''));

/** Most recent set logged for an exercise, so the editor can pre-fill sensibly. */
function lastSet(exId) {
  for (const s of store.data.sessions) {
    const entry = (s.entries ?? []).find(e => e.ex === exId);
    if (entry?.sets?.length) return entry.sets.at(-1);
  }
  return null;
}

/**
 * @param {string|null} [routineId] prefill from a stock routine
 * @param {object} [planDay] prefill from a generated plan day — already scaled
 *                           for the athlete, their season and today's readiness
 */
export function logSessionFlow(routineId, planDay) {
  const routine = routineId ? byId(ROUTINES, routineId) : null;

  /** @type {{ex:string, sets:{reps:number,weight:number}[], note?:string}[]} */
  let entries = [];
  if (planDay) {
    // A generated day already carries a prescribed load per exercise, worked
    // out from the athlete, the season and what the log says about that muscle.
    entries = planDay.entries.map(e => ({
      ex: e.ex,
      note: e.load?.note,
      sets: Array.from({ length: e.sets }, () => ({
        reps: e.reps,
        weight: e.load?.kg != null ? roundToPlates(e.load.kg, store.unit) : (lastSet(e.ex)?.weight ?? 0),
      })),
    }));
  } else if (routine) {
    // A stock routine has no load of its own, so ask the model for one rather
    // than opening every field at zero and making someone guess.
    entries = routine.blocks.map(b => {
      const suggested = suggestLoad(b.ex, store.data.profile, store.data, { reps: b.reps, rir: 2 });
      return {
        ex: b.ex,
        note: suggested?.note,
        sets: Array.from({ length: b.sets }, () => ({
          reps: b.reps,
          weight: suggested?.kg != null ? roundToPlates(suggested.kg, store.unit) : (lastSet(b.ex)?.weight ?? 0),
        })),
      };
    });
  }

  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(720px, calc(100vw - 24px))';
  dlg.innerHTML = `
    <form class="card card-pad-lg stack" style="gap:16px">
      <div class="row-between">
        <h3>Log a session</h3>
        <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="sName">Session name</label>
          <input class="input" id="sName" name="name" required value="${esc(planDay?.name ?? routine?.name ?? 'Training session')}">
        </div>
        <div class="field">
          <label for="sDur">Duration (min)</label>
          <input class="input" id="sDur" name="durationMin" type="number" min="1" max="600" value="${planDay?.minutes ?? routine?.minutes ?? 45}">
        </div>
      </div>

      <div class="field">
        <label for="sDate">Date</label>
        <input class="input" id="sDate" name="date" type="date" value="${todayISO()}" max="${todayISO()}">
      </div>

      <div class="stack" style="gap:9px">
        <div class="row-between"><p class="eyebrow">Exercises</p></div>
        <div id="entries" class="stack" style="gap:9px"></div>
        <button type="button" class="btn btn-sm" id="addEx">${icon('search')}<span>Add an exercise</span></button>
      </div>

      <div class="field">
        <label for="sNote">Note (optional)</label>
        <input class="input" id="sNote" name="note" placeholder="Felt strong, bumped the bench">
      </div>

      <div class="row-between" style="gap:10px">
        <span class="dim num" style="font-size:.82rem" id="volTotal"></span>
        <div class="row" style="gap:10px">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${icon('check')}<span>Save session</span></button>
        </div>
      </div>
    </form>`;

  const host = dlg.querySelector('#entries');
  const volEl = dlg.querySelector('#volTotal');

  function volume() {
    return entries.reduce((tot, e) => {
      const ex = byId(EXERCISES, e.ex);
      if (ex?.kind !== 'strength') return tot;
      return tot + e.sets.reduce((t, s) => t + (+s.reps || 0) * (+s.weight || 0), 0);
    }, 0);
  }

  function draw() {
    if (!entries.length) {
      host.innerHTML = `<p class="dim" style="font-size:.85rem;padding:10px 0">
        No exercises yet — add one below, or start from a routine on the Workouts page.</p>`;
    } else {
      const u = store.unit;
      host.innerHTML = entries.map((entry, ei) => {
        const ex = byId(EXERCISES, entry.ex);
        return `<div class="card" style="padding:12px;background:var(--surf-2)">
          <div class="row-between" style="margin-bottom:9px">
            <div style="min-width:0">
              <strong style="font-size:.9rem">${esc(ex.name)}</strong>
              <span class="dim" style="font-size:.74rem"> · ${esc(ex.muscle)}</span>
              ${entry.note ? `<br><small class="dim" style="font-size:.7rem">${esc(entry.note)}</small>` : ''}
            </div>
            <button type="button" class="btn btn-ghost btn-sm" data-del="${ei}" aria-label="Remove ${esc(ex.name)}">${icon('trash')}</button>
          </div>
          <div class="stack" style="gap:6px">
            ${entry.sets.map((set, si) => `
              <div class="row" style="gap:8px">
                <span class="dim num" style="font-size:.74rem;width:34px">Set ${si + 1}</span>
                <input class="input" style="min-height:36px;padding:6px 10px" type="number" min="0" max="999"
                  value="${set.reps}" data-e="${ei}" data-s="${si}" data-k="reps" aria-label="Reps">
                <span class="dim" style="font-size:.74rem">reps</span>
                <input class="input" style="min-height:36px;padding:6px 10px" type="number" min="0" max="999"
                  value="${ex.unit === 'kg' ? toDisplay(set.weight, u) : set.weight}"
                  step="${ex.unit === 'kg' && u === 'lb' ? 5 : 0.5}"
                  data-e="${ei}" data-s="${si}" data-k="weight" aria-label="Weight"
                  ${ex.kind === 'strength' && ex.unit === 'kg' ? '' : 'disabled'}>
                <span class="dim" style="font-size:.74rem;width:32px">${unitLabel(ex, u)}</span>
                <button type="button" class="btn btn-ghost btn-sm" data-delset="${ei}:${si}" aria-label="Remove set">${icon('x')}</button>
              </div>`).join('')}
            <button type="button" class="btn btn-ghost btn-sm" data-addset="${ei}" style="justify-self:start">${icon('plus')}<span>Add set</span></button>
          </div>
        </div>`;
      }).join('');
    }
    volEl.textContent = volume() ? `Volume: ${Math.round(toDisplay(volume(), store.unit, { decimals: 0 })).toLocaleString()} ${weightLabel(store.unit)}` : '';
  }

  dlg.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) {
      const raw = +t.value || 0;
      const entry = entries[+t.dataset.e];
      // Weight is typed in the athlete's unit and stored in kilograms. Reps
      // are a count and belong to neither system.
      const isLoad = t.dataset.k === 'weight' && byId(EXERCISES, entry.ex)?.unit === 'kg';
      entry.sets[+t.dataset.s][t.dataset.k] =
        isLoad ? toStoredKg(raw, store.unit) ?? 0 : raw;
      volEl.textContent = volume() ? `Volume: ${Math.round(toDisplay(volume(), store.unit, { decimals: 0 })).toLocaleString()} ${weightLabel(store.unit)}` : '';
    }
  });

  dlg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.del !== undefined) { entries.splice(+b.dataset.del, 1); draw(); }
    else if (b.dataset.addset !== undefined) {
      const entry = entries[+b.dataset.addset];
      entry.sets.push({ ...(entry.sets.at(-1) ?? { reps: 8, weight: 0 }) });
      draw();
    } else if (b.dataset.delset) {
      const [ei, si] = b.dataset.delset.split(':').map(Number);
      entries[ei].sets.splice(si, 1);
      if (!entries[ei].sets.length) entries.splice(ei, 1);
      draw();
    }
  });

  /*
   * A search, not a dropdown. The picker used to be a `<select>` of every
   * exercise — fine at fifty, unusable at a thousand, and no way to find
   * anything unless you already knew what it was called.
   */
  dlg.querySelector('#addEx').addEventListener('click', () => pickExercise(ex => {
    const prev = lastSet(ex.id);
    const reps = prev?.reps ?? 8;
    const suggested = suggestLoad(ex.id, store.data.profile, store.data, { reps, rir: 2 });
    entries.push({
      ex: ex.id,
      note: prev ? undefined : suggested?.note,
      sets: [{ reps, weight: prev?.weight ?? (suggested?.kg != null ? roundToPlates(suggested.kg, store.unit) : 0) }],
    });
    draw();
    host.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }));

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  dlg.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!entries.length) return toast('Add at least one exercise', 'bad');

    const fd = Object.fromEntries(new FormData(e.target));
    const before = new Set(store.data.medals);

    await store.addSession({
      name: fd.name.trim() || 'Training session',
      date: fd.date || todayISO(),
      durationMin: Math.max(1, +fd.durationMin || 45),
      note: fd.note?.trim() ?? '',
      startedAt: Date.now(),
      entries: entries.map(en => ({ ex: en.ex, sets: en.sets.filter(s => s.reps > 0) })).filter(en => en.sets.length),
    });

    close();
    toast('Session logged', 'ok');
    const fresh = store.data.medals.filter(id => !before.has(id));
    fresh.forEach((id, i) => {
      const md = byId(MEDALS, id);
      if (md) setTimeout(() => toast(`Medal unlocked: ${md.name}`, 'ok'), 500 + i * 900);
    });
  });

  document.body.append(dlg);
  draw();
  dlg.showModal();
}


/**
 * Pick an exercise from the catalog.
 *
 * Opens over the session editor rather than replacing it, so adding three
 * movements is three taps of the plus button and not three trips back and
 * forth. `onPick` fires per selection and the dialog stays open.
 */
function pickExercise(onPick) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.style.width = 'min(620px, calc(100vw - 24px))';
  dlg.innerHTML = `
    <div class="card card-pad-lg stack" style="gap:14px">
      <div class="row-between">
        <h3>Add an exercise</h3>
        <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div id="pickHost"></div>
      <button class="btn btn-ghost btn-block" data-close>Done</button>
    </div>`;

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  document.body.append(dlg);
  dlg.showModal();

  const cat = mountCatalog(dlg.querySelector('#pickHost'), {
    profile: store.data.profile,
    equipment: store.data.profile.equipment,
    limits: store.data.profile.limits,
    compact: true,
    onPick: ex => { onPick(ex); toast(`${ex.name} added`, 'ok'); },
  });
  cat.focus();
}
