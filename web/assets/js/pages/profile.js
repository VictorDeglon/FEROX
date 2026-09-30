/** Profile — account, goals, units, themes, weigh-in cadence and data control. */
import { store, RESET_CLEARS, RESET_KEEPS } from '../core/store.js';
import {
  bootPage, esc, num, toast, modal, confirmPhrase, avatarHtml,
  applyMode, applyPalette, currentMode, currentPalette,
} from '../core/ui.js';
import { icon, googleGlyph } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { googleReady } from '../core/config.js';
import { MEDALS } from '../core/seed.js';
import { makeAvatar, formatBytes, AVATAR_PX } from '../core/image.js';
import { LEVELS, GOALS, ACTIVITY, EQUIPMENT, targetsFor } from '../core/profile.js';
import { seasonById, currentSlot } from '../core/seasons.js';
import { PALETTES, MODES, availablePalettes } from '../core/themes.js';
import { unlockedEggs, EGG_COUNT } from '../core/eggs.js';
import { measuredTargets } from '../core/plan.js';
import { weighInFlow } from './_weighin.js';

/** What someone has to type before the hard reset will run. */
const RESET_PHRASE = 'RESET MY STATS';

/** Weigh-in cadences offered in settings. `0` turns the prompt off. */
const CADENCES = [
  { days: 1, label: 'Every day',      hint: 'Most signal, most noise' },
  { days: 2, label: 'Every other day', hint: 'The default — enough to see a trend' },
  { days: 3, label: 'Every 3 days',   hint: 'Lighter touch' },
  { days: 7, label: 'Weekly',         hint: 'Same day each week' },
  { days: 0, label: 'Never ask',      hint: 'Log them yourself when you want' },
];

const view = await bootPage({ title: 'Profile' }, render);

function render(el) {
  const d = store.data;
  const p = d.profile;
  const s = store.stats();
  const u = auth.user ?? { name: p.name, provider: 'guest' };

  el.innerHTML = `
    <section class="grid grid-main">
      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="row wrap" style="gap:18px;align-items:center">
            <button class="avatar-edit" id="avatarBtn" aria-label="Change profile picture">
              ${avatarHtml({ ...u, picture: d.profile.picture || u.picture }, 'avatar avatar-lg')}
              <span class="avatar-edit-badge">${icon('plus')}</span>
            </button>
            <input type="file" id="avatarIn" accept="image/*" hidden>
            <div class="grow" style="min-width:0">
              <h2 style="font-size:1.4rem">${esc(u.name)}</h2>
              <p class="dim" style="font-size:.86rem;margin-top:3px">
                @${esc(p.handle)} · ${u.provider === 'google' ? 'Signed in with Google' : 'Guest — data on this device'}
              </p>
            </div>
            <button class="btn btn-ghost btn-sm" id="editName">${icon('settings')}<span>Edit</span></button>
          </div>
          <div class="grid grid-4" style="gap:12px;margin-top:20px;padding-top:18px;border-top:1px solid var(--line)">
            ${mini('Sessions', num(s.sessions))}
            ${mini('Volume', `${num(s.volume)} kg`)}
            ${mini('Medals', `${d.medals.length} / ${MEDALS.length}`)}
            ${mini('Best streak', `${s.bestStreak} d`)}
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head">
            <h3>Training profile</h3>
            <a class="card-link" href="onboarding.html?redo=1">Redo setup →</a>
          </div>
          <div class="grid grid-3" style="gap:12px">
            ${mini('Goal', GOALS.find(g => g.id === p.goal)?.label ?? '—')}
            ${mini('Experience', LEVELS.find(l => l.id === p.level)?.label ?? '—')}
            ${mini('Days / week', p.daysPerWeek ?? '—')}
            ${mini('Equipment', EQUIPMENT.find(e => e.id === p.equipment)?.label ?? '—')}
            ${mini('Activity', (ACTIVITY.find(x => x.id === p.activity)?.label ?? '—').split(',')[0])}
            ${mini('Weight', p.weightKg ? `${p.weightKg} kg` : '—')}
            ${mini('Height', p.heightCm ? `${p.heightCm} cm` : '—')}
            ${mini('Age', p.age ?? '—')}
            ${mini('Working around', p.limits?.filter(l => l !== 'none').length || 'Nothing')}
          </div>
          <button class="btn btn-sm" id="editTraining" style="margin-top:16px">${icon('settings')}<span>Edit training profile</span></button>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Daily targets</h3><button class="btn btn-ghost btn-sm" id="editGoals">Edit</button></div>
          <div class="grid grid-4" style="gap:12px">
            ${mini('Calories', `${num(p.goals.kcal)}`, 'kcal')}
            ${mini('Protein', p.goals.protein, 'g')}
            ${mini('Carbs', p.goals.carbs, 'g')}
            ${mini('Fat', p.goals.fat, 'g')}
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
            ${mini('Sessions per week', p.goals.sessionsPerWeek)}
          </div>
        </div>

        ${themeCard(d)}

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Your data</h3></div>
          <p class="muted" style="font-size:.87rem">
            FEROX is free and stores everything ${store.isRemote ? 'on your FEROX server' : 'in this browser'}.
            Export any time — it's plain JSON, yours to keep.</p>
          <div class="row wrap" style="gap:10px;margin-top:16px">
            <button class="btn btn-sm" id="exportBtn">${icon('download')}<span>Export JSON</span></button>
            <button class="btn btn-sm" id="importBtn">${icon('arrowUp')}<span>Import</span></button>
          </div>
          <input type="file" id="fileIn" accept="application/json" hidden>
        </div>

        <div class="card card-pad-lg zone-danger">
          <div class="card-head"><h3>Start over</h3></div>
          <p class="muted" style="font-size:.87rem">
            Wipes every stat, medal and meal and puts you back at day one — while keeping
            the things that are facts about you rather than scores: your measurements and
            your training year.</p>
          <div class="fate-grid" style="margin-top:14px">
            <div>
              <p class="eyebrow" style="color:var(--bad);margin-bottom:8px">Deleted</p>
              <ul class="fate-list">${RESET_CLEARS
                .map(i => `<li class="fate-gone">${icon('x')}<span>${esc(i)}</span></li>`).join('')}</ul>
            </div>
            <div>
              <p class="eyebrow" style="color:var(--ok);margin-bottom:8px">Kept</p>
              <ul class="fate-list">${RESET_KEEPS
                .map(i => `<li class="fate-kept">${icon('check')}<span>${esc(i)}</span></li>`).join('')}</ul>
            </div>
          </div>
          <div class="row wrap" style="gap:10px;margin-top:18px">
            <button class="btn btn-sm btn-danger" id="resetBtn">${icon('trash')}<span>Full reset</span></button>
            <button class="btn btn-sm btn-ghost" id="wipeBtn" style="color:var(--text-3)">Erase everything, including setup</button>
          </div>
        </div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="card-head"><h3>Account</h3></div>
          ${u.provider === 'google'
            ? `<div class="stack" style="gap:12px">
                <span class="chip chip-ok">${icon('check')}Google connected</span>
                <p class="muted" style="font-size:.85rem">${esc(u.email || 'No email on this account')}</p>
                ${auth.session?.verified
                  ? `<p class="dim" style="font-size:.78rem">Verified by your FEROX server.</p>`
                  : `<p class="dim" style="font-size:.78rem">Signed in for display only — no server is configured,
                     so your data stays on this device.</p>`}
                <button class="btn btn-sm btn-block" id="signOut">${icon('logout')}<span>Sign out</span></button>
              </div>`
            : `<div class="stack" style="gap:12px">
                <p class="muted" style="font-size:.86rem">You're using FEROX as a guest — no account,
                  nothing sent anywhere, and your whole log saved on this device. Sign in with Google
                  only if you want a name and picture on your profile.</p>
                <div id="gBtn"></div>
                ${googleReady() ? '' : `<p class="dim" style="font-size:.76rem">
                  Google Sign-In needs a client id — see <code>docs/google-oauth-setup.md</code>.</p>`}
              </div>`}
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Preferences</h3></div>
          <div class="stack" style="gap:14px">
            <div class="field">
              <label for="unit">Weight unit</label>
              <select class="select" id="unit">
                <option value="kg"${p.unit === 'kg' ? ' selected' : ''}>Kilograms</option>
                <option value="lb"${p.unit === 'lb' ? ' selected' : ''}>Pounds</option>
              </select>
            </div>
            <div class="field">
              <label for="height">Height (cm)</label>
              <input class="input" id="height" type="number" min="100" max="250" value="${p.heightCm ?? ''}">
            </div>
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Weigh-ins</h3></div>
          <div class="stack" style="gap:14px">
            <div class="field">
              <label for="cadence">Ask me to weigh in</label>
              <select class="select" id="cadence">
                ${CADENCES.map(c => `<option value="${c.days}"${d.settings.weighInEvery === c.days ? ' selected' : ''}>
                  ${esc(c.label)}</option>`).join('')}
              </select>
              <p class="dim" style="font-size:.76rem">
                ${esc(CADENCES.find(c => c.days === d.settings.weighInEvery)?.hint ?? '')}</p>
            </div>
            <div class="field">
              <label for="cpEvery">Checkpoint every</label>
              <select class="select" id="cpEvery">
                ${[7, 14, 21, 28].map(n => `<option value="${n}"${d.settings.checkpointEvery === n ? ' selected' : ''}>
                  ${n} days</option>`).join('')}
              </select>
              <p class="dim" style="font-size:.76rem">
                How often FEROX sets a weight goal and checks the plan against reality.
                A fortnight is long enough for water weight to average out.</p>
            </div>
            <div class="row-between">
              <span class="muted" style="font-size:.85rem">Weigh-ins logged</span>
              <span class="num dim" style="font-size:.85rem">${num(d.checkIns.length)}</span>
            </div>
            <button class="btn btn-sm btn-block" id="weighNow">${icon('scale')}<span>Log one now</span></button>
          </div>
        </div>

        ${measuredCard()}

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Storage</h3></div>
          <div class="stack" style="gap:8px;font-size:.85rem">
            <div class="row-between"><span class="muted">Mode</span>
              <span class="chip ${store.isRemote ? 'chip-ok' : ''}">${store.isRemote ? 'FEROX API' : 'This device'}</span></div>
            <div class="row-between"><span class="muted">Member since</span><span class="dim">${esc(p.joined)}</span></div>
            <div class="row-between"><span class="muted">Records</span>
              <span class="num dim">${num(d.sessions.length + d.meals.length + d.weights.length)}</span></div>
          </div>
        </div>
      </div>
    </section>`;

  el.querySelector('#editName').addEventListener('click', editProfile);

  const avatarIn = el.querySelector('#avatarIn');
  el.querySelector('#avatarBtn').addEventListener('click', () => avatarIn.click());
  avatarIn.addEventListener('change', async () => {
    const file = avatarIn.files?.[0];
    avatarIn.value = '';
    if (!file) return;
    try {
      const { dataUrl, bytes, from } = await makeAvatar(file);
      await store.updateProfile({ picture: dataUrl });
      toast(`Photo set — ${from.w}×${from.h} resized to ${AVATAR_PX}px, ${formatBytes(bytes)}`, 'ok');
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  el.querySelector('#editTraining').addEventListener('click', editTraining);
  el.querySelector('#editGoals').addEventListener('click', editGoals);
  el.querySelector('#signOut')?.addEventListener('click', async () => { await auth.signOut(); location.href = 'index.html'; });

  el.querySelector('#unit').addEventListener('change', e => store.updateProfile({ unit: e.target.value }));
  el.querySelector('#height').addEventListener('change', e => store.updateProfile({ heightCm: +e.target.value }));

  el.querySelector('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([store.export()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `ferox-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Exported', 'ok');
  });

  const fileIn = el.querySelector('#fileIn');
  el.querySelector('#importBtn').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files?.[0];
    if (!file) return;
    try {
      await store.import(await file.text());
      toast('Data imported', 'ok');
    } catch {
      toast('That file is not a FEROX export', 'bad');
    }
    fileIn.value = '';
  });

  /*
   * The hard reset. A typed phrase rather than a click, because there is no
   * undo and, on a static deployment, no server-side copy to restore from.
   */
  el.querySelector('#resetBtn').addEventListener('click', async () => {
    const ok = await confirmPhrase({
      title: 'Full reset',
      phrase: RESET_PHRASE,
      message: 'Every stat, medal and meal goes. Your measurements and your training year stay. '
             + 'This cannot be undone.',
      clears: RESET_CLEARS,
      keeps: RESET_KEEPS,
      submit: 'Reset everything',
    });
    if (!ok) return;
    await store.resetProgress();
    toast('Reset. Day one.', 'ok');
  });

  /* The genuine wipe, including onboarding — a separate, quieter button. */
  el.querySelector('#wipeBtn').addEventListener('click', async () => {
    const ok = await confirmPhrase({
      title: 'Erase everything',
      phrase: 'ERASE EVERYTHING',
      message: 'This empties the account completely and sends you back through setup. '
             + 'Nothing at all is kept.',
      clears: [...RESET_CLEARS, 'Weigh-ins and measurements', 'Seasons and training year',
               'Friends', 'Your profile and setup answers'],
      keeps: ['Nothing'],
      submit: 'Erase it all',
    });
    if (!ok) return;
    await store.reset();
    toast('Erased');
    location.href = 'onboarding.html';
  });

  /* ---- theme ---- */

  el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    applyMode(b.dataset.mode);
    render(el);
  }));
  el.querySelectorAll('[data-palette]').forEach(b => b.addEventListener('click', async () => {
    applyPalette(b.dataset.palette);
    // Persist to the document as well as the local cache, so a signed-in
    // account keeps its colours on the next device it opens.
    await store.updateSettings({ palette: b.dataset.palette });
    render(el);
  }));

  /* ---- weigh-in cadence ---- */

  el.querySelector('#cadence').addEventListener('change', async e => {
    const days = +e.target.value;
    await store.updateSettings({ weighInEvery: days });
    toast(days ? `Asking every ${days === 1 ? 'day' : `${days} days`}` : 'Weigh-in prompts off', 'ok');
    render(el);
  });
  el.querySelector('#cpEvery').addEventListener('change', async e => {
    await store.updateSettings({ checkpointEvery: +e.target.value });
    toast(`Checkpoints every ${e.target.value} days`, 'ok');
  });
  el.querySelector('#weighNow').addEventListener('click', () => weighInFlow());

  el.querySelector('#useMeasured')?.addEventListener('click', async () => {
    const m = measuredTargets();
    if (!m?.measured) return;
    await store.updateProfile({
      goals: {
        ...store.data.profile.goals,
        kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
      },
    });
    toast(`Targets rebuilt from your own data`, 'ok');
  });

  const gBtn = el.querySelector('#gBtn');
  if (gBtn) mountGoogle(gBtn);
}

/**
 * The Theme panel.
 *
 * Hidden until the phrase is found, and honest about it when it is not: an
 * easter egg nobody can tell exists is just dead code, so the locked state
 * says there is something to find without saying what. It does not reveal the
 * phrase, the console, or which of the two ways in there are.
 */
function themeCard(d) {
  const unlocked = availablePalettes(d.unlocks);
  const found = unlockedEggs().length;

  if (unlocked.length <= 1) {
    return `<div class="card card-pad-lg" id="themes">
      <div class="card-head"><h3>Appearance</h3>
        <span class="chip dim">${found} / ${EGG_COUNT} found</span></div>
      <div class="row wrap" style="gap:10px">
        ${MODES.map(m => `<button class="btn btn-sm" data-mode="${m}"
          aria-pressed="${currentMode() === m}">${icon(m === 'light' ? 'sun' : 'moon')}<span>${m === 'light' ? 'Light' : 'Dark'}</span></button>`).join('')}
      </div>
      <p class="dim" style="font-size:.8rem;margin-top:14px">
        There are more colours in here than these. FEROX is not going to tell you
        where they are — but somebody knows, and the app is listening.</p>
    </div>`;
  }

  return `<div class="card card-pad-lg" id="themes">
    <div class="card-head">
      <h3>Theme</h3>
      <span class="chip chip-ember">${icon('sparkle')}unlocked</span>
    </div>

    <p class="eyebrow" style="margin-bottom:10px">Mode</p>
    <div class="row wrap" style="gap:10px;margin-bottom:20px">
      ${MODES.map(m => `<button class="btn btn-sm" data-mode="${m}"
        aria-pressed="${currentMode() === m}">${icon(m === 'light' ? 'sun' : 'moon')}<span>${m === 'light' ? 'Light' : 'Dark'}</span></button>`).join('')}
    </div>

    <p class="eyebrow" style="margin-bottom:10px">Palette</p>
    <div class="theme-grid">
      ${unlocked.map(t => `<button class="theme-card" data-palette="${esc(t.id)}"
        aria-pressed="${currentPalette() === t.id}">
        <span class="theme-swatch">${t.swatch.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</span>
        <span><strong>${esc(t.name)}</strong><small>${esc(t.hint)}</small></span>
      </button>`).join('')}
    </div>
    <p class="dim" style="font-size:.78rem;margin-top:14px">
      Every palette has its own dark and light mode, and Ember is always here to go back to.
      ${found < EGG_COUNT ? `${EGG_COUNT - found} more to find.` : 'You have found all of them.'}</p>
  </div>`;
}

/**
 * What the log says the targets should be, next to what they are.
 *
 * Shown as a suggestion with a button, never applied silently — someone who set
 * their calories deliberately should not find them quietly rewritten because a
 * fortnight of data disagreed.
 */
function measuredCard() {
  const measured = measuredTargets();
  if (!measured?.measured || Math.abs(measured.delta) < 50) return '';

  return `<div class="card card-pad-lg">
    <div class="card-head"><h3>Your data disagrees</h3><span class="chip chip-warn">suggestion</span></div>
    <p class="muted" style="font-size:.86rem">
      Measured from your own weigh-ins and food log, maintenance looks like
      ${num(measured.maintenance)} kcal. For this season that puts your target at
      ${num(measured.kcal)} kcal — ${measured.delta > 0 ? '+' : ''}${num(measured.delta)} on what you
      have set now.</p>
    <button class="btn btn-sm btn-primary btn-block" id="useMeasured" style="margin-top:14px">
      ${icon('check')}<span>Use ${num(measured.kcal)} kcal</span></button>
    <p class="dim" style="font-size:.75rem;margin-top:10px">
      Nothing changes until you press this.</p>
  </div>`;
}

/** Render Google's button, or an honest disabled state plus the guest path. */
async function mountGoogle(host) {
  if (!googleReady()) {
    host.innerHTML = `<button class="btn btn-google btn-block" disabled>
      ${googleGlyph()}<span>Sign in with Google</span></button>`;
    return;
  }
  try {
    await auth.mountGoogleButton(host);
  } catch {
    host.innerHTML = `<p class="dim" style="font-size:.8rem">Google Sign-In could not load. Check your connection.</p>`;
  }
}


function mini(label, value, unit = '') {
  return `<div class="stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value" style="font-size:1.2rem">${esc(value)}${unit ? `<span class="stat-unit">${esc(unit)}</span>` : ''}</span>
  </div>`;
}

async function editProfile() {
  const p = store.data.profile;
  const res = await modal({
    title: 'Edit profile',
    body: `
      <div class="field">
        <label for="pn">Display name</label>
        <input class="input" id="pn" name="name" value="${esc(auth.user?.name ?? p.name)}" required>
      </div>
      <div class="field">
        <label for="ph">Handle</label>
        <input class="input" id="ph" name="handle" value="${esc(p.handle)}">
      </div>`,
  });
  if (!res) return;
  await store.updateProfile({
    name: res.name.trim(),
    handle: res.handle.trim().toLowerCase().replace(/\s+/g, '_') || 'athlete',
  });
  toast('Profile updated', 'ok');
}

/** Change the answers that drive the plan, then rebuild the targets from them. */
async function editTraining() {
  const p = store.data.profile;
  const res = await modal({
    title: 'Training profile',
    wide: true,
    body: `
      <div class="field-row">
        <div class="field"><label for="tw">Weight (kg)</label>
          <input class="input" id="tw" name="weightKg" type="number" min="35" max="250" step="0.1" value="${p.weightKg ?? 78}"></div>
        <div class="field"><label for="th">Height (cm)</label>
          <input class="input" id="th" name="heightCm" type="number" min="120" max="230" value="${p.heightCm ?? 178}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="ta">Age</label>
          <input class="input" id="ta" name="age" type="number" min="14" max="90" value="${p.age ?? 25}"></div>
        <div class="field"><label for="td">Days per week</label>
          <input class="input" id="td" name="daysPerWeek" type="number" min="2" max="7" value="${p.daysPerWeek ?? 4}"></div>
      </div>
      <div class="field"><label for="tg">Goal</label>
        <select class="select" id="tg" name="goal">
          ${GOALS.map(g => `<option value="${g.id}"${p.goal === g.id ? ' selected' : ''}>${esc(g.label)}</option>`).join('')}
        </select></div>
      <div class="field-row">
        <div class="field"><label for="tl">Experience</label>
          <select class="select" id="tl" name="level">
            ${LEVELS.map(l => `<option value="${l.id}"${p.level === l.id ? ' selected' : ''}>${esc(l.label)}</option>`).join('')}
          </select></div>
        <div class="field"><label for="te">Equipment</label>
          <select class="select" id="te" name="equipment">
            ${EQUIPMENT.map(e => `<option value="${e.id}"${p.equipment === e.id ? ' selected' : ''}>${esc(e.label)}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><label for="tact">Daily activity outside training</label>
        <select class="select" id="tact" name="activity">
          ${ACTIVITY.map(a => `<option value="${a.id}"${p.activity === a.id ? ' selected' : ''}>${esc(a.label)}</option>`).join('')}
        </select></div>
      <p class="dim" style="font-size:var(--step--2)">Changing these rebuilds your split and your calorie targets.</p>`,
  });
  if (!res) return;

  const patch = {
    weightKg: +res.weightKg, heightCm: +res.heightCm, age: +res.age,
    daysPerWeek: +res.daysPerWeek, goal: res.goal,
    level: +res.level, equipment: res.equipment, activity: +res.activity,
  };
  const merged = { ...store.data.profile, ...patch };
  const slot = currentSlot(store.data.layout ?? 4);
  const season = seasonById(store.data.seasons?.[slot.id]) ?? seasonById('ferox-recomp');
  await store.updateProfile({ ...patch, goals: targetsFor(merged, season) });
  toast('Plan rebuilt', 'ok');
}

async function editGoals() {
  const g = store.data.profile.goals;
  const res = await modal({
    title: 'Daily targets',
    body: `
      <div class="field-row">
        <div class="field"><label for="gk">Calories</label>
          <input class="input" id="gk" name="kcal" type="number" min="800" max="8000" value="${g.kcal}"></div>
        <div class="field"><label for="gp">Protein (g)</label>
          <input class="input" id="gp" name="protein" type="number" min="0" max="500" value="${g.protein}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="gc">Carbs (g)</label>
          <input class="input" id="gc" name="carbs" type="number" min="0" max="900" value="${g.carbs}"></div>
        <div class="field"><label for="gf">Fat (g)</label>
          <input class="input" id="gf" name="fat" type="number" min="0" max="300" value="${g.fat}"></div>
      </div>
      <div class="field">
        <label for="gs">Sessions per week</label>
        <input class="input" id="gs" name="sessionsPerWeek" type="number" min="1" max="14" value="${g.sessionsPerWeek}">
      </div>`,
  });
  if (!res) return;
  await store.updateProfile({
    goals: {
      kcal: +res.kcal, protein: +res.protein, carbs: +res.carbs,
      fat: +res.fat, sessionsPerWeek: +res.sessionsPerWeek,
    },
  });
  toast('Targets updated', 'ok');
}
