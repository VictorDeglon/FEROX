/** Landing page: brand marks, generated sections and the sign-in entry point. */
import { icon, brandMark, googleGlyph, social, SOCIALS } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { googleReady } from '../core/config.js';
import { esc, toggleTheme, revealOnScroll, firstImage, modal } from '../core/ui.js';
import { store } from '../core/store.js';
import { ring } from '../core/chart.js';
import { MEDALS } from '../core/seed.js';

/* marks ------------------------------------------------------------------ */
document.getElementById('headMark').innerHTML = brandMark(30);
document.getElementById('footMark').innerHTML = brandMark(22);
document.getElementById('ctaMark').innerHTML = brandMark(64);
document.getElementById('heroMedal').innerHTML = icon('flame');
document.getElementById('heroMedal').classList.add('medal-disc');
Object.assign(document.getElementById('heroMedal').querySelector('svg').style, { width: '20px', height: '20px' });

/* theme ------------------------------------------------------------------ */
const themeBtn = document.getElementById('themeBtn');
const syncTheme = () => {
  themeBtn.innerHTML = icon(document.documentElement.dataset.theme === 'light' ? 'sun' : 'moon');
};
themeBtn.addEventListener('click', () => { toggleTheme(); syncTheme(); });
syncTheme();

/* hero art --------------------------------------------------------------- */
document.getElementById('heroRing').innerHTML = `
  <div class="row" style="gap:20px;align-items:center">
    ${ring([{ value: 1840, color: 'var(--ember)' }], {
      max: 2400, size: 112, stroke: 11,
      center: `<div><div style="font-family:var(--font-display);font-weight:800;font-size:1.25rem">1,840</div>
               <div class="dim" style="font-size:.64rem">of 2,400 kcal</div></div>`,
    })}
    <div class="stack grow" style="gap:4px">
      <div class="stat"><span class="stat-label">Volume today</span>
        <span class="stat-value" style="font-size:1.35rem">6,420<span class="stat-unit">kg</span></span></div>
      <div class="dim" style="font-size:.74rem">5 exercises · 18 sets</div>
    </div>
  </div>`;

document.getElementById('heroBars').innerHTML = [
  ['Protein', 148, 165, 'var(--viz-2)'],
  ['Carbs', 212, 260, 'var(--viz-4)'],
  ['Fat', 58, 75, 'var(--viz-3)'],
].map(([label, v, t, color]) => `
  <div>
    <div class="row-between" style="margin-bottom:4px">
      <span style="font-size:.78rem;font-weight:600">${label}</span>
      <span class="dim num" style="font-size:.74rem">${v} / ${t} g</span>
    </div>
    <div class="bar bar-thin"><i style="width:${(v / t) * 100}%;background:${color}"></i></div>
  </div>`).join('');

/* features --------------------------------------------------------------- */
const FEATURES = [
  ['calendar', 'FEROX Seasons', 'Eight structured seasons across four blocks of the year. Greek Fire through the summer, Winter Fire through the winter, or FEROX Recomp any month you like.'],
  ['dumbbell', 'Workout logging', 'Six ready-made routines or build your own. Reps, weight and volume captured set by set, in seconds between working sets.'],
  ['apple', 'Diet tracker', 'A food database, four meals a day and a live macro ring. See exactly how far you are from your calorie and protein targets.'],
  ['chart', 'Progress that reads clearly', 'Volume, bodyweight, calories and training focus, charted over 14, 30 or 90 days. No vanity metrics.'],
  ['target', 'Personal records', 'Every lift tracked for its best set, with an estimated one-rep max and a trend line you can actually follow.'],
  ['medal', 'Medals worth having', 'Twelve of them, earned from streaks, tonnage, records and hitting your macros. They unlock themselves.'],
  ['users', 'Friends and leaderboard', 'Compare streaks, sessions, volume and medals with the people you train with. Being fourth is a great reason to train tomorrow.'],
];
document.getElementById('featureGrid').innerHTML = FEATURES.map(([ico, title, body]) => `
  <article class="feature card card-pad-lg reveal">
    <div class="feature-ico">${icon(ico)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
  </article>`).join('');

/* steps ------------------------------------------------------------------ */
const STEPS = [
  ['Open it', 'No sign-up wall, no email, no credit card. The app loads and works immediately — as a guest if you like.'],
  ['Log the work', 'Pick a routine or add exercises by hand. Food goes in from a searchable database, one tap for the things you eat daily.'],
  ['Watch it compound', 'Streaks build, records fall, medals unlock. Everything exports as JSON whenever you want it.'],
];
document.getElementById('stepGrid').innerHTML = STEPS.map(([title, body], i) => `
  <article class="card card-pad-lg stack reveal" style="gap:12px">
    <span style="font-family:var(--font-display);font-weight:900;font-size:2.4rem;line-height:1;color:var(--ember);opacity:.35">0${i + 1}</span>
    <h3>${esc(title)}</h3>
    <p class="muted" style="font-size:.9rem">${esc(body)}</p>
  </article>`).join('');

/* medals ----------------------------------------------------------------- */
document.getElementById('medalGrid').innerHTML = MEDALS.slice(0, 8).map((m, i) => `
  <article class="card medal ${i < 4 ? 'earned' : ''}">
    <div class="medal-disc">${icon(m.icon)}</div>
    <div>
      <div class="medal-name">${esc(m.name)}</div>
      <p class="dim" style="font-size:.74rem;margin-top:3px">${esc(m.hint)}</p>
    </div>
  </article>`).join('');

/* free list -------------------------------------------------------------- */
document.getElementById('freeList').innerHTML = [
  'Works offline once loaded — the gym basement is fine',
  'Nothing is sent anywhere by default',
  'Export and import your whole log as JSON',
  'Open source, so you can check all of the above',
].map(t => `<li class="row" style="gap:10px;align-items:flex-start">
  <span style="color:var(--ok);width:17px;flex:none;margin-top:2px">${icon('check')}</span>
  <span class="muted" style="font-size:.9rem">${esc(t)}</span></li>`).join('');

/* sign in ---------------------------------------------------------------- */
const host = document.getElementById('googleHost');
const note = document.getElementById('authNote');

if (googleReady()) {
  auth.mountGoogleButton(host).catch(() => {
    host.innerHTML = fallbackButton();
    note.textContent = 'Google Sign-In could not load — the guest path works exactly the same.';
  });
  note.textContent = 'Signing in only adds your name and picture. Your training data stays on this device.';
} else {
  host.innerHTML = fallbackButton();
  note.innerHTML = 'Google Sign-In is not configured on this deployment yet. See <code>docs/google-oauth-setup.md</code> to switch it on.';
}

function fallbackButton() {
  return `<button class="btn btn-google btn-lg btn-block" disabled>${googleGlyph()}<span>Sign in with Google</span></button>`;
}

/**
 * Signing in when this device already holds a log. Until there is a server to
 * sync with, "import" means one real question: keep what is here, or start
 * over? Asking beats silently doing either.
 */
auth.onChange(async session => {
  if (!session) return;
  await store.init({ token: auth.token });

  if (!store.hasLocalData()) {
    location.href = 'onboarding.html';
    return;
  }

  const keep = await modal({
    title: 'Bring your data across?',
    submit: 'Keep it',
    cancel: 'Start fresh',
    body: `<p class="muted" style="font-size:var(--step--1)">
        This device already has ${store.data.sessions.length} session${store.data.sessions.length === 1 ? '' : 's'},
        ${store.data.meals.length} meal${store.data.meals.length === 1 ? '' : 's'} logged
        and ${store.data.weights.length} weigh-in${store.data.weights.length === 1 ? '' : 's'}.</p>
      <p class="muted" style="font-size:var(--step--1);margin-top:10px">
        Keep it and it carries over to your account. Start fresh and it is deleted from this device —
        export it first from your profile if you are not sure.</p>`,
  });

  if (keep === null) {
    await store.reset();
    location.href = 'onboarding.html';
  } else {
    await store.updateProfile({
      name: session.user.name || store.data.profile.name,
      email: session.user.email ?? '',
      picture: session.user.picture || store.data.profile.picture,
    });
    location.href = store.data.onboarded ? 'dashboard.html' : 'onboarding.html';
  }
});

document.getElementById('guestBtn').addEventListener('click', () => {
  auth.signInAsGuest();
  location.href = 'onboarding.html';
});

document.getElementById('footSocial').innerHTML = SOCIALS.map(s =>
  `<a href="${s.url}" target="_blank" rel="noopener noreferrer"
     aria-label="FEROX on ${s.label}" class="social-link">${social(s.id, 18)}</a>`).join('');

/* mascot ------------------------------------------------------------------
   Optional art. If web/assets/brand/mascot.* has been added (see
   docs/mascot-prompts.md and scripts/add-mascot.js) it takes over the closing
   panel; otherwise the geometric mark stays and nothing looks unfinished. */
firstImage(['assets/brand/mascot.webp', 'assets/brand/mascot.png', 'assets/brand/mascot.jpg'])
  .then(src => {
    if (!src) return;
    const host = document.getElementById('ctaMark');
    host.className = 'mascot glow-aura';
    host.style.width = '';
    // 320×400, not 320×320: the art is 4:5, and reserving a square box makes
    // the page jump when the real proportions arrive.
    host.innerHTML = `<img class="mascot-art" src="${src}" alt="" width="320" height="400"
      loading="lazy" decoding="async">`;
  });

/* motion ----------------------------------------------------------------- */
revealOnScroll();

for (const sv of document.querySelectorAll('.medal-disc svg')) {
  sv.style.width = '30px'; sv.style.height = '30px';
}
