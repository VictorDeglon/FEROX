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
/*
 * Led by what actually drives growth rather than by what the app stores.
 * "Progress charted over 14, 30 or 90 days" is a feature list written from the
 * inside; "it tells you what weight to put on the bar" is what someone deciding
 * whether to open it needs to hear.
 */
const FEATURES = [
  ['scale', 'It tells you the weight',
    'Not a blank box. FEROX works out a starting weight for every lift from your bodyweight, '
    + 'age and experience — deliberately a little light — then adds to it every time you hit '
    + 'your reps. That is progressive overload, done for you.'],
  ['chart', 'It finds your weak points',
    'Every muscle group is measured against what you should be lifting. The ones ahead earn '
    + 'heavier weight; the ones behind earn an extra set. Your plan reshapes itself around '
    + 'whatever is actually lagging.'],
  ['dumbbell', 'A thousand exercises, sorted',
    'Barbell, dumbbell, machine, cable, bands, bodyweight, plyometrics. Search any of them and '
    + 'see exactly which muscles it works on a body map. Tell FEROX what kit you have and it '
    + 'only ever programmes what you can actually do.'],
  ['apple', 'Food without the faff',
    'Four hundred foods, a plate builder for meals you make yourself, and it quietly learns your '
    + 'regulars — eat the same thing twice and it offers to save it for one-tap logging.'],
  ['flame', 'It works around you',
    'Bad knee, no gym, four days a week, feeling wrecked today? Say so and the session changes. '
    + 'Training at 60% on a bad day beats the session you skip.'],
  ['calendar', 'Seasons, not one setting',
    'Twelve training blocks across the year. A strength block trains you in heavy triples; a cut '
    + 'trains you in high-rep supersets. The split and the exercises change with it, not just a number.'],
  ['target', 'Targets that adapt',
    'FEROX measures your actual metabolism from your weigh-ins and your food log, rather than '
    + 'trusting an equation, and adjusts your calories to what your body is really doing.'],
  ['shield', 'No account, no ads, no upsell',
    'Everything above is free and switched on. There is no paid tier to unlock, because there is '
    + 'nothing to sell you.'],
];
document.getElementById('featureGrid').innerHTML = FEATURES.map(([ico, title, body]) => `
  <article class="feature card card-pad-lg reveal">
    <div class="feature-ico">${icon(ico)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
  </article>`).join('');

/* what other apps charge for --------------------------------------------- */
const PAYWALLED = [
  'A plan built for your body',
  'Knowing what weight to lift',
  'Automatic progressive overload',
  'The full exercise library',
  'Macro and calorie tracking',
  'Custom meals and recipes',
  'Progress charts and history',
  'Exporting your own data',
  'Removing the ads',
];
document.getElementById('priceTable').innerHTML = PAYWALLED.map(t => `
  <div class="price-row">
    <span class="price-them">£9.99/mo</span>
    <span class="price-what">${esc(t)}</span>
    <span class="price-us">Free</span>
  </div>`).join('');

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
  'Every feature, switched on, with no account',
  'Works offline once loaded — the gym basement is fine',
  'Nothing is sent anywhere by default, ever',
  'Your whole log exports as plain JSON in one tap',
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
