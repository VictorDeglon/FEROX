/**
 * Shared UI: the app shell, theme, toasts, modals and formatting helpers.
 * Every app page calls `mountShell()` once and then renders into `#view`.
 */
import { CONFIG } from './config.js';
import { icon, brandMark, social, SOCIALS } from './icons.js';
import { auth } from './auth.js';
import { store } from './store.js';
import { initTheme, applyMode, applyPalette, toggleMode, currentMode, currentPalette } from './themes.js';
import { redeem } from './eggs.js';

/* -------------------------------------------------------------- formatting */

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const nf = new Intl.NumberFormat(undefined);
export const num = n => nf.format(Math.round(n));
export const kg  = n => `${nf.format(Math.round(n * 10) / 10)} kg`;
export const kcal = n => `${nf.format(Math.round(n))} kcal`;

export function relDate(iso) {
  const days = Math.round((Date.parse(todayStr()) - Date.parse(iso)) / 864e5);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
export function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
export const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/* ------------------------------------------------------------------- theme */

/*
 * Mode and palette both live in core/themes.js. This runs at module load, from
 * the localStorage cache only, so the page paints in the right colours rather
 * than flashing the default and correcting itself once the store has loaded.
 */
initTheme();

export { initTheme, applyMode, applyPalette, currentMode, currentPalette };
export const toggleTheme = toggleMode;

/**
 * Reconcile the cached theme with the athlete's stored preference.
 * Called once the store is ready; only writes if the two disagree, so it costs
 * nothing on the overwhelmingly common path where they match.
 */
export function syncThemeFromStore() {
  const wanted = store.data.settings?.palette ?? 'ember';
  if (wanted !== currentPalette()) applyPalette(wanted);
}

/* ------------------------------------------------------------------ toasts */

let toastHost;
export function toast(message, kind = '') {
  toastHost ??= Object.assign(document.body.appendChild(document.createElement('div')), { className: 'toasts' });
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${kind === 'ok' ? icon('check') : kind === 'bad' ? icon('x') : icon('sparkle')}<span>${esc(message)}</span>`;
  el.querySelector('svg').style.cssText = 'width:16px;height:16px;flex:none';
  toastHost.append(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0'; el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

/* ------------------------------------------------------------------ modals */

/**
 * Open a <dialog> built from a title + body HTML.
 * Resolves with the submitted FormData, or null if dismissed.
 */
/**
 * @param {{title, body, submit?, cancel?, wide?, onMount?}} opts
 *        `onMount` receives the live dialog before it opens, for the cases
 *        where two fields have to stay in step — servings and grams, body fat
 *        and lean mass — which a static body string cannot express.
 */
export function modal({ title, body, submit = 'Save', cancel = 'Cancel', wide = false, onMount = null }) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    if (wide) dlg.style.width = 'min(680px, calc(100vw - 32px))';
    dlg.innerHTML = `
      <form method="dialog" class="card card-pad-lg stack" style="gap:18px">
        <div class="row-between">
          <h3>${esc(title)}</h3>
          <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <div class="stack">${body}</div>
        <div class="row" style="justify-content:flex-end;gap:10px">
          <button type="button" class="btn btn-ghost" data-close>${esc(cancel)}</button>
          <button type="submit" class="btn btn-primary" value="ok">${esc(submit)}</button>
        </div>
      </form>`;

    let done = false;
    const finish = value => { if (done) return; done = true; resolve(value); dlg.close(); dlg.remove(); };

    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => finish(null)));
    dlg.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
    dlg.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      finish(Object.fromEntries(new FormData(e.target)));
    });

    document.body.append(dlg);
    onMount?.(dlg);
    dlg.showModal();
    dlg.querySelector('input, select, textarea')?.focus();
  });
}

export function confirmDialog(title, message, { danger = true } = {}) {
  return modal({ title, body: `<p class="muted" style="font-size:.9rem">${esc(message)}</p>`, submit: danger ? 'Delete' : 'Confirm' })
    .then(r => r !== null);
}

/**
 * Confirmation for something that genuinely cannot be undone: the phrase has to
 * be typed out, exactly, before the button will do anything.
 *
 * A normal confirm is one reflexive click away from a mistake, and this app has
 * no server-side backup to restore from — on a static deployment the data lives
 * in one browser and nowhere else. Making someone type the words is the cheapest
 * way to guarantee they read them.
 *
 * @param {{title:string, phrase:string, message:string,
 *          clears?:string[], keeps?:string[], submit?:string}} opts
 * @returns {Promise<boolean>} true only if the phrase was typed and confirmed.
 */
export function confirmPhrase({ title, phrase, message, clears = [], keeps = [], submit = 'Reset' }) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    const list = (items, cls, ico) => items.length
      ? `<ul class="fate-list">${items.map(i =>
          `<li class="${cls}">${icon(ico)}<span>${esc(i)}</span></li>`).join('')}</ul>`
      : '';

    dlg.innerHTML = `
      <form class="card card-pad-lg stack" style="gap:16px">
        <div class="row-between">
          <h3>${esc(title)}</h3>
          <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <p class="muted" style="font-size:.88rem">${esc(message)}</p>
        <div class="fate-grid">
          <div>
            <p class="eyebrow" style="color:var(--bad);margin-bottom:8px">Deleted</p>
            ${list(clears, 'fate-gone', 'x')}
          </div>
          <div>
            <p class="eyebrow" style="color:var(--ok);margin-bottom:8px">Kept</p>
            ${list(keeps, 'fate-kept', 'check')}
          </div>
        </div>
        <div class="field">
          <label for="phraseIn">Type <code class="phrase">${esc(phrase)}</code> to confirm</label>
          <input class="input" id="phraseIn" autocomplete="off" autocapitalize="characters"
            spellcheck="false" placeholder="${esc(phrase)}" aria-describedby="phraseHint">
          <p class="dim" id="phraseHint" style="font-size:.76rem">This cannot be undone. Export your data first if you want a copy.</p>
        </div>
        <div class="row" style="justify-content:flex-end;gap:10px">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-danger" disabled>${esc(submit)}</button>
        </div>
      </form>`;

    const input = dlg.querySelector('#phraseIn');
    const go = dlg.querySelector('button[type=submit]');
    // Case and surrounding space are forgiven; the words are not.
    const matches = () => input.value.trim().toUpperCase() === phrase.toUpperCase();
    input.addEventListener('input', () => {
      go.disabled = !matches();
      input.classList.toggle('input-ok', matches());
    });

    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); dlg.close(); dlg.remove(); };
    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => finish(false)));
    dlg.addEventListener('cancel', e => { e.preventDefault(); finish(false); });
    dlg.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      finish(matches());
    });

    document.body.append(dlg);
    dlg.showModal();
    input.focus();
  });
}

/* ---------------------------------------------------------- secret console */

let consoleOpen = false;

/**
 * The hidden prompt. Opened with the backtick key, or by tapping the wolf mark
 * five times. Says nothing about what it wants — that is the game.
 */
export function openSecretConsole() {
  if (consoleOpen) return;
  consoleOpen = true;

  const dlg = document.createElement('dialog');
  dlg.className = 'modal secret-modal';
  dlg.innerHTML = `
    <form class="card card-pad-lg stack secret" style="gap:14px">
      <div class="row-between">
        <p class="eyebrow" style="color:var(--ember)">◂ FEROX ▸</p>
        <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="field">
        <label for="secretIn" class="sr-only">Say something</label>
        <input class="input secret-input" id="secretIn" autocomplete="off" spellcheck="false"
          placeholder="say something" aria-label="Secret phrase">
      </div>
      <p class="secret-out dim" id="secretOut">The wolf is listening.</p>
      <div class="row" style="justify-content:flex-end">
        <button type="submit" class="btn btn-sm btn-primary">Speak</button>
      </div>
    </form>`;

  const input = dlg.querySelector('#secretIn');
  const out = dlg.querySelector('#secretOut');

  // Enter submits. Implicit form submission inside a <dialog> is inconsistent
  // enough across browsers that it is not worth relying on for the one control
  // this dialog has.
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    dlg.querySelector('form').requestSubmit();
  });

  const close = () => { consoleOpen = false; dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  dlg.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await redeem(input.value);
    if (!res.ok) {
      out.textContent = res.message;
      out.className = 'secret-out dim';
      dlg.querySelector('.card').classList.remove('secret-hit');
      // Let the shake restart even on a second identical miss.
      void dlg.offsetWidth;
      dlg.querySelector('.card').classList.add('secret-miss');
      setTimeout(() => dlg.querySelector('.card')?.classList.remove('secret-miss'), 420);
      return;
    }
    out.innerHTML = `<strong style="color:var(--ember-hi)">${esc(res.egg.title)}</strong><br>${esc(res.message)}` +
      (res.already ? `<br><span class="dim">(you already had this one)</span>` : '');
    out.className = 'secret-out';
    dlg.querySelector('.card').classList.add('secret-hit');
    input.value = '';
    if (!res.already && res.egg.goto) {
      out.innerHTML += `<br><a class="card-link" href="${res.egg.goto}" style="color:var(--ember)">Take me there →</a>`;
    }
  });

  document.body.append(dlg);
  dlg.showModal();
  input.focus();
}

/**
 * Two ways in, neither of them signposted.
 *
 * The backtick key is the desktop one, ignored while you are typing into
 * anything. The phone one is five quick taps on the page title in the top bar —
 * the oldest trick there is, and deliberately *not* the wolf mark beside it,
 * because that mark is a link to the dashboard and the first tap would navigate
 * away before the fifth ever landed.
 */
function wireSecretConsole(shell) {
  const typing = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  document.addEventListener('keydown', e => {
    if (e.key !== '`' && e.key !== '~') return;
    if (typing(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    openSecretConsole();
  });

  const title = shell.querySelector('.topbar h1');
  if (!title) return;
  let taps = 0, timer;
  title.addEventListener('click', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { taps = 0; }, 700);
    if (++taps >= 5) { taps = 0; clearTimeout(timer); openSecretConsole(); }
  });
}

/* ------------------------------------------------------------------- shell */

const NAV = [
  { href: 'dashboard.html', label: 'Today',    ico: 'home',     tab: true },
  { href: 'workouts.html',  label: 'Workouts', ico: 'dumbbell', tab: true },
  { href: 'nutrition.html', label: 'Nutrition',ico: 'apple',    tab: true },
  { href: 'progress.html',  label: 'Progress', ico: 'chart',    tab: true },
  { href: 'seasons.html',   label: 'Seasons',  ico: 'calendar', tab: true },
  { group: 'More' },
  { href: 'records.html',   label: 'Records',  ico: 'target' },
  { href: 'medals.html',    label: 'Medals',   ico: 'medal' },
  { href: 'friends.html',   label: 'Friends',  ico: 'users' },
  { href: 'profile.html',   label: 'Profile',  ico: 'user' },
  { href: 'docs.html',      label: 'Docs',     ico: 'book' },
];

const here = () => location.pathname.split('/').pop() || 'dashboard.html';

function navHtml() {
  return NAV.map(item => {
    if (item.group) return `<p class="eyebrow nav-label">${esc(item.group)}</p>`;
    const cur = item.href === here() ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${cur}>${icon(item.ico)}<span>${esc(item.label)}</span></a>`;
  }).join('');
}

function tabHtml() {
  return NAV.filter(i => i.tab).map(item => {
    const cur = item.href === here() ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${cur}>${icon(item.ico)}<span>${esc(item.label)}</span></a>`;
  }).join('');
}

function avatarHtml(user, cls = 'avatar') {
  if (user?.picture) {
    return `<img class="${cls}" src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer"
      onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls}',textContent:'${esc(initials(user.name))}'}))">`;
  }
  return `<div class="${cls}">${esc(initials(user?.name ?? 'Guest'))}</div>`;
}
export { avatarHtml };

/**
 * Build the sidebar + topbar + tab bar around the page's `#view` element.
 * @param {{title:string, actions?:string}} opts
 */
export function mountShell({ title, actions = '' }) {
  const view = document.getElementById('view');
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="dashboard.html" aria-label="FEROX home">
        ${brandMark(30)}
        <span class="brand-word">Ferox</span>
      </a>
      <nav class="nav" aria-label="Main">${navHtml()}</nav>
      <div class="sidebar-foot">
        <div class="card" style="padding:12px;display:grid;gap:10px">
          <div class="row" id="userChip"></div>
          <div class="row" style="gap:6px">
            <button class="btn btn-ghost btn-sm grow" id="themeBtn">${icon('moon')}<span>Theme</span></button>
            <button class="btn btn-ghost btn-sm" id="signOutBtn" aria-label="Sign out">${icon('logout')}</button>
          </div>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <a class="brand" href="dashboard.html" style="display:none" id="mBrand">
          ${brandMark(30)}
        </a>
        <h1 class="grow">${esc(title)}</h1>
        <div class="row" id="topActions">${actions}</div>
      </header>
      <main class="content" id="content"></main>
      ${appFooter()}
    </div>
    <nav class="tabbar" aria-label="Sections">${tabHtml()}</nav>`;

  view.replaceWith(shell);
  const content = shell.querySelector('#content');
  content.id = 'view';

  // Brand mark shows in the topbar only on mobile, where the sidebar is hidden.
  const mq = matchMedia('(max-width: 899px)');
  const syncBrand = () => { shell.querySelector('#mBrand').style.display = mq.matches ? 'inline-flex' : 'none'; };
  mq.addEventListener('change', syncBrand); syncBrand();

  const themeBtn = shell.querySelector('#themeBtn');
  const syncTheme = () => {
    const light = currentMode() === 'light';
    themeBtn.innerHTML = `${icon(light ? 'sun' : 'moon')}<span>${light ? 'Light' : 'Dark'}</span>`;
    themeBtn.title = 'Switch mode — palettes live in your profile';
  };
  themeBtn.addEventListener('click', () => { toggleTheme(); syncTheme(); });
  // A palette change from the profile has to relabel this button too.
  document.addEventListener('ferox:theme', syncTheme);
  syncTheme();

  shell.querySelector('#signOutBtn').addEventListener('click', async () => {
    await auth.signOut();
    location.href = 'index.html';
  });

  const chip = shell.querySelector('#userChip');
  const syncUser = () => {
    const u = auth.user ?? { name: 'Guest', provider: 'guest' };
    chip.innerHTML = `${avatarHtml(u, 'avatar avatar-sm')}
      <div style="min-width:0;line-height:1.25">
        <div style="font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name)}</div>
        <div class="dim" style="font-size:.68rem">${u.provider === 'google' ? 'Google account' : 'On this device'}</div>
      </div>`;
  };
  auth.onChange(syncUser); syncUser();

  wireSecretConsole(shell);

  return content;
}

/** The small print, on every app page. */
function appFooter() {
  return `<footer class="app-foot">
    <div class="row wrap" style="gap:18px;align-items:center;justify-content:space-between">
      <div class="row wrap" style="gap:16px">
        <a href="docs.html#about">How it works</a>
        <a href="docs.html#research">Research</a>
        <a href="docs.html#privacy">Privacy</a>
        <a href="docs.html#terms">Terms</a>
      </div>
      <div class="row" style="gap:10px">
        ${SOCIALS.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer"
          aria-label="FEROX on ${s.label}" class="social-link">${social(s.id, 17)}</a>`).join('')}
      </div>
    </div>
    <p class="dim" style="font-size:var(--step--2);margin-top:12px">
      FEROX is a tracking tool, not medical advice. Free, open source, and yours to export any time.</p>
  </footer>`;
}

/** Redirect to the landing page unless someone has started a session. */
export function requireSession() {
  if (!auth.signedIn) {
    auth.signInAsGuest();          // nothing here is sensitive; never dead-end a visitor
  }
  return auth.user;
}

/** Standard page bootstrap: session, shell, store, then render. */
export async function bootPage({ title, actions = '' }, render) {
  const view = mountShell({ title, actions });
  view.innerHTML = `<div class="grid grid-3">${'<div class="skel" style="height:118px"></div>'.repeat(3)}</div>`;

  // The shell paints from the cached session so the header is never blank,
  // then Firebase gets the final word on who this is. Waiting matters: the
  // Firestore rules key on a signed-in uid, so loading the log before the SDK
  // has restored the account reads as an anonymous request and is refused.
  await auth.restore();
  requireSession();                       // guest fallback, once Firebase is sure

  await store.init({ uid: auth.uid });
  syncThemeFromStore();

  // Nobody sees the app before it knows who they are — an empty dashboard with
  // stranger's defaults is a worse first impression than two minutes of setup.
  if (!store.data.onboarded) {
    location.replace('onboarding.html');
    return view;
  }
  const draw = () => { try { render(view); } catch (err) { console.error(err); view.innerHTML = errorCard(err); } };

  // Later store changes repaint synchronously, but the FIRST paint is deferred
  // to a macrotask. A page module sits suspended at `await bootPage(...)`, so
  // rendering inline would run render() before the module's own `const`s are
  // initialised — every one of them would be in the temporal dead zone.
  store.addEventListener('change', draw);
  setTimeout(draw, 0);
  return view;
}

function errorCard(err) {
  return `<div class="card"><h3>Something broke</h3>
    <p class="muted" style="margin-top:8px;font-size:.88rem">${esc(err.message)}</p></div>`;
}

/**
 * Resolve to the first of `srcs` that actually loads, or null if none do.
 * Lets optional art (the generated mascot) be referenced without ever shipping
 * a broken <img> — nothing is added to the DOM until a file is confirmed there.
 */
export function firstImage(srcs) {
  return srcs.reduce(
    (chain, src) => chain.then(found => found ?? new Promise(res => {
      const img = new Image();
      img.onload = () => res(src);
      img.onerror = () => res(null);
      img.src = src;
    })),
    Promise.resolve(null),
  );
}

/** Fade-in-on-scroll for the landing page. */
export function revealOnScroll(selector = '.reveal') {
  const els = [...document.querySelectorAll(selector)];
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('in'));
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i * 55, 330)}ms`; io.observe(el); });
}
