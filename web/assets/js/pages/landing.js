/** Landing page: brand marks, generated sections and the sign-in entry point. */
import { icon, brandMark, googleGlyph, social, SOCIALS } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { googleReady } from '../core/config.js';
import { esc, toggleTheme, revealOnScroll, firstImage, modal } from '../core/ui.js';
import { store, Store } from '../core/store.js';
import { detectUnit } from '../core/units.js';
import { ring } from '../core/chart.js';
import { MEDALS } from '../core/seed.js';

/* marks ------------------------------------------------------------------ */
document.getElementById('headMark').innerHTML = brandMark(30);
document.getElementById('footMark').innerHTML = brandMark(22);
document.getElementById('ctaMark').innerHTML = brandMark(64);
document.getElementById('heroMedal').innerHTML = icon('flame');
document.getElementById('heroMedal').classList.add('medal-disc');
Object.assign(document.getElementById('heroMedal').querySelector('svg').style, { width: '20px', height: '20px' });

/* units -------------------------------------------------------------------
 *
 * Guessed from the browser's own locale — no geolocation request, so nothing
 * leaves the device to work out whether someone thinks in pounds. The guess
 * is only a guess, which is why the toggle is here on the first screen rather
 * than buried in a profile the visitor has not reached yet.
 *
 * Stored under its own key because there is no athlete yet; onboarding reads
 * it as the starting answer.
 */
const UNIT_KEY = 'ferox.v2.unit';
const readUnit = () => {
  try { return localStorage.getItem(UNIT_KEY) || detectUnit(); } catch { return detectUnit(); }
};
const unitBtn = document.getElementById('unitBtn');
const syncUnit = () => {
  const u = readUnit();
  unitBtn.textContent = u === 'lb' ? 'lb / ft' : 'kg / cm';
  unitBtn.title = `Showing ${u === 'lb' ? 'pounds and feet' : 'kilograms and centimetres'} — tap to switch`;
};
unitBtn.addEventListener('click', () => {
  const next = readUnit() === 'lb' ? 'kg' : 'lb';
  try { localStorage.setItem(UNIT_KEY, next); } catch { /* private mode */ }
  syncUnit();
});
syncUnit();

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
  ['shield', 'No account, and no ads ever',
    'Everything above is free and switched on, with no card and no sign-up. Pro adds syncing '
    + 'and meal photos — the two things that cost real money to run — and nothing that is free '
    + 'today ever moves behind it.'],
];
document.getElementById('featureGrid').innerHTML = FEATURES.map(([ico, title, body]) => `
  <article class="feature card card-pad-lg reveal">
    <div class="feature-ico">${icon(ico)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
  </article>`).join('');

/* plans -------------------------------------------------------------------
 *
 * The honest shape of this: everything that works offline in a browser is
 * free, because it costs nothing to give away and holding it back would be
 * a decision made purely to create a reason to pay. Pro is the two features
 * that have a real marginal cost per user — a database holding your log, and
 * a vision model reading your dinner.
 *
 * Nothing that is free today ever moves into Pro. If that line is ever
 * crossed, this comment is the thing that was broken.
 */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    per: 'forever',
    blurb: 'The whole trainer. No account, no card.',
    features: [
      '1,369 exercises, searchable, with a body map',
      'A plan that tells you the weight and adds to it',
      'Weekly volume capped at what you can recover from',
      'Nutrition, 457 foods and the plate builder',
      'Every chart, record, medal and season',
      'Works offline. Export everything as JSON, any time.',
    ],
    cta: 'Start free',
    href: 'onboarding.html',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£3.99',
    per: 'a month',
    blurb: 'For the parts that cost real money to run.',
    featured: true,
    features: [
      'Your log on every device you own, synced',
      'Photograph a meal and have it estimated',
      'A weekly read on what your training is actually doing',
      'Every colour palette unlocked',
      'It keeps the free tier free',
    ],
    cta: 'Coming soon',
    href: null,
  },
];

document.getElementById('plans').innerHTML = PLANS.map(p => `
  <article class="plan${p.featured ? ' plan-featured' : ''}">
    <div class="row-between" style="align-items:baseline">
      <h3 style="font-size:var(--step-1)">${esc(p.name)}</h3>
      <div><span class="plan-price">${esc(p.price)}</span>
        <span class="dim" style="font-size:.78rem">${esc(p.per)}</span></div>
    </div>
    <p class="muted" style="font-size:var(--step--1)">${esc(p.blurb)}</p>
    <ul class="stack plan-list" style="gap:9px;list-style:none;padding:0">
      ${p.features.map(f => `<li class="row" style="gap:9px;align-items:flex-start">
        <span style="color:var(--ok);width:16px;flex:none;margin-top:2px">${icon('check')}</span>
        <span class="muted" style="font-size:.86rem">${esc(f)}</span></li>`).join('')}
    </ul>
    ${p.href
      ? `<a class="btn btn-primary btn-block" href="${p.href}">${esc(p.cta)}</a>`
      : `<button class="btn btn-block" disabled>${esc(p.cta)}</button>`}
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
  'The whole trainer, with no account and no card',
  'Works offline once loaded — the gym basement is fine',
  'Nothing is sent anywhere unless you sign in — guests stay offline',
  'Your whole log exports as plain JSON in one tap',
  'No ads, and nothing sold on. Not now, not later.',
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
  note.textContent = 'Signing in syncs your log to your Google account, so it follows you between devices. '
    + 'Stay a guest and nothing leaves this one.';
  // Someone who signed in last time should not be asked to do it again.
  auth.restore();

  // A redirect sign-in that failed comes back as a fresh page load with no
  // account and nothing to show for it, so say what happened.
  auth.onAuthError(code => {
    note.textContent = {
      'auth/operation-not-allowed': 'Google sign-in is not switched on for this deployment yet — carry on as a guest, it is the same app.',
      'auth/unauthorized-domain': 'This address is not on the project’s authorised domains, so Google refused the sign-in.',
    }[code] ?? 'That sign-in did not complete. Nothing was lost — try again, or carry on as a guest.';
  });
} else {
  host.innerHTML = fallbackButton();
  note.innerHTML = 'Google Sign-In is not configured on this deployment yet. See <code>docs/firebase-setup.md</code> to switch it on.';
}

function fallbackButton() {
  return `<button class="btn btn-google btn-lg btn-block" disabled>${googleGlyph()}<span>Sign in with Google</span></button>`;
}

/**
 * Signing in when this device already holds a log.
 *
 * Three cases, and only one of them is a question worth asking:
 *   the account already has a log  — it wins, silently. Someone signing back
 *                                    in wants their training, not a dialogue.
 *   the account is new, device empty — straight to onboarding.
 *   the account is new, device has a log — ask. Carrying it up or throwing it
 *                                    away are both destructive in one
 *                                    direction, so neither is a safe default.
 */
auth.onChange(async session => {
  if (!session?.verified) return;        // guests never reach this branch

  // Read the device before `init` runs: on a new account it adopts whatever is
  // here, after which "did this device have a log?" is no longer answerable.
  const deviceHadLog = Store.deviceHasData();

  await store.init({ uid: auth.uid });

  /**
   * Ask for a handle *after* the keep-or-start-fresh question, never before.
   *
   * Asking first looks friendlier and was wrong: "start fresh" runs
   * `store.reset()`, which used to wipe the handle that had just been
   * claimed. The athlete was then asked a second time and claimed another,
   * holding two names and able to release neither.
   */
  const askHandle = async () => {
    if (store.data.profile.handle) return;
    const { ensureHandle } = await import('./_handle.js');
    await ensureHandle().catch(() => {});
  };

  if (!store.freshAccount) {
    await askHandle();
    location.href = store.data.onboarded ? 'dashboard.html' : 'onboarding.html';
    return;
  }
  if (!deviceHadLog) {
    await askHandle();
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
        Keep it and it is copied up to your account, on every device you sign in to.
        Start fresh and it is deleted from this device and not uploaded —
        export it first from your profile if you are not sure.</p>`,
  });

  if (keep === null) {
    await store.reset();
    store.clearLocal();     // or signing out would hand the log straight back
    await askHandle();
    location.href = 'onboarding.html';
  } else {
    // Whatever they already chose wins. Google's display name is a *seed* for
    // someone arriving with nothing, not a correction of a name they typed
    // themselves five minutes ago in onboarding.
    await store.updateProfile({
      name: store.data.profile.name?.trim() || session.user.name || '',
      email: session.user.email ?? '',
      picture: store.data.profile.picture || session.user.picture || '',
    });
    await askHandle();
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
