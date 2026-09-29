/**
 * The "log a session" flow, shared by the dashboard and the workouts page.
 * A live set editor: pick exercises, fill reps x weight, save.
 */
import { store, todayISO } from '../core/store.js';
import { esc, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { EXERCISES, ROUTINES, MEDALS, byId } from '../core/seed.js';

const unitLabel = ex => ({ kg: 'kg', bw: 'body', sec: 'sec', km: 'km' }[ex.unit] ?? '');

/** Most recent set logged for an exercise, so the editor can pre-fill sensibly. */
function lastSet(exId) {
  for (const s of store.data.sessions) {
    const entry = (s.entries ?? []).find(e => e.ex === exId);
    if (entry?.sets?.length) return entry.sets.at(-1);
  }
  return null;
}

/** @param {string} [routineId] prefill from a routine */
export function logSessionFlow(routineId) {
  const routine = routineId ? byId(ROUTINES, routineId) : null;

  /** @type {{ex:string, sets:{reps:number,weight:number}[]}[]} */
  const entries = routine
    ? routine.blocks.map(b => {
        const prev = lastSet(b.ex);
        return {
          ex: b.ex,
          sets: Array.from({ length: b.sets }, () => ({ reps: b.reps, weight: prev?.weight ?? 0 })),
        };
      })
    : [];

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
          <input class="input" id="sName" name="name" required value="${esc(routine?.name ?? 'Training session')}">
        </div>
        <div class="field">
          <label for="sDur">Duration (min)</label>
          <input class="input" id="sDur" name="durationMin" type="number" min="1" max="600" value="${routine?.minutes ?? 45}">
        </div>
      </div>

      <div class="field">
        <label for="sDate">Date</label>
        <input class="input" id="sDate" name="date" type="date" value="${todayISO()}" max="${todayISO()}">
      </div>

      <div class="stack" style="gap:9px">
        <div class="row-between"><p class="eyebrow">Exercises</p></div>
        <div id="entries" class="stack" style="gap:9px"></div>
        <div class="row" style="gap:8px">
          <select class="select grow" id="addPick" aria-label="Add an exercise">
            ${EXERCISES.map(e => `<option value="${e.id}">${esc(e.name)} · ${esc(e.muscle)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-sm" id="addEx">${icon('plus')}<span>Add</span></button>
        </div>
      </div>

      <div class="field">
        <label for="sNote">Note (optional)</label>
        <input class="input" id="sNote" name="note" placeholder="Felt strong, bumped bench 2.5 kg">
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
      host.innerHTML = entries.map((entry, ei) => {
        const ex = byId(EXERCISES, entry.ex);
        return `<div class="card" style="padding:12px;background:var(--surf-2)">
          <div class="row-between" style="margin-bottom:9px">
            <div>
              <strong style="font-size:.9rem">${esc(ex.name)}</strong>
              <span class="dim" style="font-size:.74rem"> · ${esc(ex.muscle)}</span>
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
                <input class="input" style="min-height:36px;padding:6px 10px" type="number" min="0" max="999" step="0.5"
                  value="${set.weight}" data-e="${ei}" data-s="${si}" data-k="weight" aria-label="Weight"
                  ${ex.kind === 'strength' && ex.unit === 'kg' ? '' : 'disabled'}>
                <span class="dim" style="font-size:.74rem;width:32px">${unitLabel(ex)}</span>
                <button type="button" class="btn btn-ghost btn-sm" data-delset="${ei}:${si}" aria-label="Remove set">${icon('x')}</button>
              </div>`).join('')}
            <button type="button" class="btn btn-ghost btn-sm" data-addset="${ei}" style="justify-self:start">${icon('plus')}<span>Add set</span></button>
          </div>
        </div>`;
      }).join('');
    }
    volEl.textContent = volume() ? `Volume: ${Math.round(volume()).toLocaleString()} kg` : '';
  }

  dlg.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) {
      entries[+t.dataset.e].sets[+t.dataset.s][t.dataset.k] = +t.value || 0;
      volEl.textContent = volume() ? `Volume: ${Math.round(volume()).toLocaleString()} kg` : '';
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

  dlg.querySelector('#addEx').addEventListener('click', () => {
    const id = dlg.querySelector('#addPick').value;
    const prev = lastSet(id);
    entries.push({ ex: id, sets: [{ reps: prev?.reps ?? 8, weight: prev?.weight ?? 0 }] });
    draw();
    host.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

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
