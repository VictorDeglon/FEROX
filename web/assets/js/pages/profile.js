/** Profile — account, goals, units and data control. */
import { store } from '../core/store.js';
import { bootPage, esc, num, toast, modal, confirmDialog, avatarHtml, initials } from '../core/ui.js';
import { icon, googleGlyph } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { CONFIG, googleReady } from '../core/config.js';
import { MEDALS } from '../core/seed.js';
import { makeAvatar, formatBytes, AVATAR_PX } from '../core/image.js';
import { LEVELS, GOALS, ACTIVITY, EQUIPMENT, targetsFor } from '../core/profile.js';
import { seasonById, currentSlot } from '../core/seasons.js';

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

        <div class="card card-pad-lg">
          <div class="card-head"><h3>Your data</h3></div>
          <p class="muted" style="font-size:.87rem">
            FEROX is free and stores everything ${store.isRemote ? 'on your FEROX server' : 'in this browser'}.
            Export any time — it's plain JSON, yours to keep.</p>
          <div class="row wrap" style="gap:10px;margin-top:16px">
            <button class="btn btn-sm" id="exportBtn">${icon('download')}<span>Export JSON</span></button>
            <button class="btn btn-sm" id="importBtn">${icon('arrowUp')}<span>Import</span></button>
            <button class="btn btn-sm" id="resetBtn" style="color:var(--bad)">${icon('trash')}<span>Reset data</span></button>
          </div>
          <input type="file" id="fileIn" accept="application/json" hidden>
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
              <input class="input" id="height" type="number" min="100" max="250" value="${p.heightCm}">
            </div>
          </div>
        </div>

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

  el.querySelector('#resetBtn').addEventListener('click', async () => {
    if (await confirmDialog('Reset all data?',
      'Every session, meal and weigh-in is deleted and replaced with fresh demo data. Export first if you want a copy.')) {
      await store.reset({ demo: true });
      toast('Data reset');
    }
  });

  const gBtn = el.querySelector('#gBtn');
  if (gBtn) mountGoogle(gBtn);
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
