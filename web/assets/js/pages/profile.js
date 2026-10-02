/** Profile — account, goals, units, themes, weigh-in cadence and data control. */
import { store, RESET_CLEARS, RESET_KEEPS } from '../core/store.js';
import { weight as toDisplay, weightLabel } from '../core/units.js';
import {
  bootPage, esc, num, toast, modal, confirmPhrase, avatarHtml, displayName, displayUser,
  applyMode, applyPalette, currentMode, currentPalette,
} from '../core/ui.js';
import { icon, googleGlyph } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { handleFlow } from './_handle.js';
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
  const u = displayUser();

  el.innerHTML = `
    <section class="grid grid-main">
      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="row wrap" style="gap:18px;align-items:center">
            <button class="avatar-edit" id="avatarBtn" aria-label="Change profile picture">
              ${avatarHtml(u, 'avatar avatar-lg')}
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
            ${mini('Volume', `${num(toDisplay(s.volume, store.unit, { decimals: 0 }))} ${weightLabel(store.unit)}`)}
            ${mini('Medals', `${d.medals.length} / ${MEDALS.length}`)}
            ${mini('Best streak', `${s.bestStreak} d`)}
            ${mini('Friends', num(d.friends.filter(f => f.uid).length))}
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
            FEROX is free and stores everything ${store.isCloud
              ? 'in your Google account, so it follows you between devices'
              : 'in this browser, on this device only'}.
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
                  ? `<p class="dim" style="font-size:.78rem">Your log syncs to this account.</p>`
                  : `<p class="dim" style="font-size:.78rem">Signed in for display only — sync is not
                     configured on this deployment, so your data stays on this device.</p>`}
                <button class="btn btn-sm btn-block" id="signOut">${icon('logout')}<span>Sign out</span></button>
              </div>`
            : `<div class="stack" style="gap:12px">
                <p class="muted" style="font-size:.86rem">You're using FEROX as a guest — no account,
                  nothing sent anywhere, and your whole log saved on this device. Sign in with Google
                  to sync it to your account and pick it up on your phone.</p>
                <div id="gBtn"></div>
                ${googleReady() ? '' : `<p class="dim" style="font-size:.76rem">
                  Sign-in needs a Firebase config — see <code>docs/firebase-setup.md</code>.</p>`}
              </div>`}
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Preferences</h3></div>
          <div class="stack" style="gap:14px">
            <div class="field">
              <label for="disc">Discoverable</label>
              <select class="select" id="disc">
                <option value="1"${p.discoverable !== false ? ' selected' : ''}>Suggest me to other athletes</option>
                <option value="0"${p.discoverable === false ? ' selected' : ''}>Keep me out of suggestions</option>
              </select>
            </div>
            <div class="field">
              <label for="unit">Units</label>
              <select class="select" id="unit">
                <option value="kg"${p.unit !== 'lb' ? ' selected' : ''}>Metric — kg and cm</option>
                <option value="lb"${p.unit === 'lb' ? ' selected' : ''}>Imperial — lb and ft</option>
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
              <span class="chip ${store.isCloud ? 'chip-ok' : ''}">${store.isCloud ? 'Your Google account' : 'This device'}</span></div>
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
      await cropFlow(file);
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  el.querySelector('#editTraining').addEventListener('click', editTraining);
  el.querySelector('#editGoals').addEventListener('click', editGoals);
  el.querySelector('#signOut')?.addEventListener('click', async () => { await auth.signOut(); location.href = 'index.html'; });

  el.querySelector('#disc')?.addEventListener('change', async e => {
    // Off blanks the matching fields in the public document rather than only
    // hiding the profile — see publicProfileFrom. The next publish carries
    // the blanks, and forgetting the throttle makes that happen now.
    const on = e.target.value === '1';
    await store.updateProfile({ discoverable: on });
    if (auth.uid) {
      const { forgetPublished, syncPublicProfile } = await import('../core/social.js');
      forgetPublished(auth.uid);
      await syncPublicProfile(auth.uid, store.data, store.stats());
    }
    toast(on ? 'You can be suggested to other athletes' : 'You are out of suggestions', 'ok');
  });

  el.querySelector('#unit').addEventListener('change', async e => {
    // Display only — nothing stored is touched, so this is reversible and
    // cannot lose a decimal. The page redraws so every number on it flips.
    await store.setUnit(e.target.value);
    toast(e.target.value === 'lb' ? 'Showing pounds and feet' : 'Showing kilograms and centimetres', 'ok');
  });
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
    // Hand the handle and the public profile back before the local wipe —
    // afterwards we no longer know which handle was ours to release.
    const held = store.data.profile.handle;
    if (auth.uid && held) {
      const { releaseHandle } = await import('../core/social.js');
      await releaseHandle(auth.uid, held);
    }
    // The handle has just been given back, so this is the one reset that must
    // not carry it forward — keeping it would leave a name pointing at
    // nothing and the athlete unable to claim it again.
    await store.reset({ keepIdentity: false });
    const { forgetKeys } = await import('../core/crypto.js');
    await forgetKeys();            // the message key goes with the account
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

/**
 * Name and picture are yours to change freely. The handle is not — it has to
 * be unique across everybody, so it goes through its own dialog where
 * availability is checked and the claim is a transaction.
 *
 * This used to be a plain text input that lowercased whatever was typed and
 * saved it, which meant two people could hold the same handle and the second
 * one silently won.
 */
async function editProfile() {
  const p = store.data.profile;
  const signedIn = Boolean(auth.uid);

  const res = await modal({
    title: 'Edit profile',
    body: `
      <div class="field">
        <label for="pn">Display name</label>
        <input class="input" id="pn" name="name" maxlength="40"
          value="${esc(p.name || auth.user?.name || '')}" required>
        <p class="dim" style="font-size:.76rem;margin-top:5px">
          What people see. Change it as often as you like.</p>
      </div>

      <div class="field">
        <label>Handle</label>
        ${signedIn
          ? `<div class="row-between" style="gap:10px;padding:9px 12px;border:1px solid var(--line);
                  border-radius:var(--r-md);background:var(--surf-2)">
               <span class="num" style="font-size:.9rem">${p.handle ? `@${esc(p.handle)}` : 'Not claimed yet'}</span>
               <button type="button" class="btn btn-sm" id="chgHandle">${p.handle ? 'Change' : 'Claim'}</button>
             </div>
             <p class="dim" style="font-size:.76rem;margin-top:5px">
               Unique to you, and how friends find you.</p>`
          : `<div class="row-between" style="gap:10px;padding:9px 12px;border:1px solid var(--line);
                  border-radius:var(--r-md);background:var(--surf-2)">
               <span class="dim" style="font-size:.86rem">Sign in to claim one</span>
             </div>
             <p class="dim" style="font-size:.76rem;margin-top:5px">
               A handle has to be unique across everybody, so it needs an account.</p>`}
      </div>`,

    onMount(dlg) {
      dlg.querySelector('#chgHandle')?.addEventListener('click', async () => {
        // Save the name first so the handle dialog publishes the current one
        // alongside it, rather than whatever was there when the page loaded.
        const typed = dlg.querySelector('#pn').value.trim();
        if (typed && typed !== p.name) await store.updateProfile({ name: typed });
        await handleFlow({ first: !p.handle });
        dlg.querySelector('[data-close]')?.click();
      });
    },
  });

  if (!res) return;
  const name = res.name.trim().slice(0, 40);
  if (name && name !== p.name) {
    await store.updateProfile({ name });
    toast('Profile updated', 'ok');
  }
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

/**
 * Pick the square, then save it.
 *
 * The crop used to happen the instant a file was chosen, dead centre, and on
 * a portrait photo that reliably took the chin and lost the top of the head.
 * The default is smarter now (see core/image.js) but no rule is right for
 * every photograph, so this shows the result and lets it be moved.
 *
 * A slider rather than a drag: it works with a thumb, a mouse and a keyboard
 * without three separate code paths, and the whole interaction is one axis
 * anyway — the horizontal centre is almost always correct.
 */
async function cropFlow(file) {
  let focusY = null;                 // null = let the heuristic decide
  let made = await makeAvatar(file, AVATAR_PX, { focusY });

  const res = await modal({
    title: 'Position your photo',
    submit: 'Use this',
    body: `
      <div class="stack" style="gap:14px;justify-items:center">
        <img id="cropPrev" class="avatar" src="${esc(made.dataUrl)}" alt=""
          style="width:140px;height:140px">
        <div class="field" style="width:100%">
          <label for="cropY">Move up or down</label>
          <input type="range" class="slider" id="cropY" min="0" max="100" value="25"
            style="--pct:25%" aria-label="Vertical position of the crop">
        </div>
        <p class="dim" style="font-size:.76rem;text-align:center">
          ${made.from.w}×${made.from.h}, squared to ${AVATAR_PX}px.
          Stays on this device — other people see your initials unless you signed in with Google.</p>
      </div>`,

    onMount(dlg) {
      const slider = dlg.querySelector('#cropY');
      const prev = dlg.querySelector('#cropPrev');
      let timer = null;

      slider.addEventListener('input', () => {
        slider.style.setProperty('--pct', `${slider.value}%`);
        // Re-encoding on every pixel of slider movement is wasted work; a
        // short debounce keeps it responsive without re-compressing 60×/sec.
        clearTimeout(timer);
        timer = setTimeout(async () => {
          focusY = +slider.value / 100;
          try {
            made = await makeAvatar(file, AVATAR_PX, { focusY });
            prev.src = made.dataUrl;
          } catch { /* keep the last good crop */ }
        }, 90);
      });
    },
  });

  if (!res) return;
  await store.updateProfile({ picture: made.dataUrl });
  toast(`Photo set — ${formatBytes(made.bytes)}`, 'ok');
}
