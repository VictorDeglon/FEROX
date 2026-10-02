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
/**
 * Who to call this person on screen.
 *
 * The profile wins over the account. `auth.user.name` is whatever Google has
 * on file, and it only ever *seeds* the nickname — if it kept winning, the
 * name someone picks here would be saved and then never displayed anywhere,
 * which is exactly what was happening.
 */
export const displayName = () =>
  (store.data?.profile?.name || '').trim() || auth.user?.name || 'Athlete';

/** The avatar to draw: the uploaded one first, then Google's. */
export const displayUser = () => ({
  ...(auth.user ?? { provider: 'guest' }),
  name: displayName(),
  picture: store.data?.profile?.picture || auth.user?.picture || '',
});

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
/** How long a notification stays before the bar runs out. */
const TOAST_MS = 3400;

/**
 * A notification, top right.
 *
 * Each one carries a themed bar that drains left to right; when it runs out
 * the card is crushed towards the right edge and goes. The bar is doing a
 * job rather than decorating: it says how long this will be on screen, so a
 * message that matters can be read deliberately instead of guessed at, and
 * nothing ever vanishes without having visibly announced that it would.
 *
 * Identical messages collapse into one with a count instead of stacking.
 * Saving three things in a row used to produce three separate "Saved"
 * cards sliding past each other, which is the sort of thing that reads as a
 * glitch even though every part of it is working.
 */
export function toast(message, kind = '') {
  toastHost ??= Object.assign(document.body.appendChild(document.createElement('div')),
    { className: 'toasts', role: 'region', ariaLabel: 'Notifications' });

  const text = String(message ?? '');

  // Already on screen? Bump it rather than stacking a duplicate.
  const twin = [...toastHost.children].find(c => c.dataset.msg === text && !c.dataset.going);
  if (twin) {
    const n = (+twin.dataset.n || 1) + 1;
    twin.dataset.n = n;
    twin.querySelector('.toast-count').textContent = `×${n}`;
    twin.querySelector('.toast-count').hidden = false;
    const bar = twin.querySelector('.toast-bar');
    bar.style.animation = 'none';
    void bar.offsetWidth;                       // restart the drain
    bar.style.animation = '';
    clearTimeout(+twin.dataset.timer);
    twin.dataset.timer = setTimeout(() => dismissToast(twin), TOAST_MS);
    return;
  }

  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.dataset.msg = text;
  el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  el.innerHTML = `
    <span class="toast-ico">${kind === 'ok' ? icon('check') : kind === 'bad' ? icon('x') : icon('sparkle')}</span>
    <span class="toast-text">${esc(text)}</span>
    <span class="toast-count" hidden></span>
    <span class="toast-bar" style="animation-duration:${TOAST_MS}ms"></span>`;

  // Hovering holds it. Reading a message should not be a race.
  el.addEventListener('pointerenter', () => {
    clearTimeout(+el.dataset.timer);
    el.querySelector('.toast-bar').style.animationPlayState = 'paused';
  });
  el.addEventListener('pointerleave', () => {
    el.querySelector('.toast-bar').style.animationPlayState = 'running';
    el.dataset.timer = setTimeout(() => dismissToast(el), 900);
  });
  el.addEventListener('click', () => dismissToast(el));

  toastHost.append(el);
  el.dataset.timer = setTimeout(() => dismissToast(el), TOAST_MS);
}

function dismissToast(el) {
  if (!el.isConnected || el.dataset.going) return;
  el.dataset.going = '1';
  clearTimeout(+el.dataset.timer);
  el.classList.add('crush');
  // Fall back to a plain remove if the animation never fires — a reduced
  // motion setting shortens it to nothing, and `animationend` on a 0.01ms
  // animation is not something to stake a leaked DOM node on.
  const done = () => el.remove();
  el.addEventListener('animationend', done, { once: true });
  setTimeout(done, 700);
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

/**
 * The mobile tab bar, plus the way to everything it cannot hold.
 *
 * Five tabs is the most a thumb can reach comfortably, and FEROX has ten
 * pages — so for a long time the other five, Profile and Friends among them,
 * were simply unreachable on a phone: the sidebar that holds them is
 * `display: none` below 900px. The fifth tab is now More, and it opens the
 * rest. Seasons moves in with them because it is the one of the five you
 * visit monthly rather than daily.
 *
 * `aria-current` lights More when the open page lives inside it, so the bar
 * never shows nothing selected.
 */
const TAB_LIMIT = 4;
const primary = () => NAV.filter(i => i.tab).slice(0, TAB_LIMIT);
const overflow = () => NAV.filter(i => i.href && !primary().includes(i));

function tabHtml() {
  const inMore = overflow().some(i => i.href === here());
  const tabs = primary().map(item => {
    const cur = item.href === here() ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${cur}>${icon(item.ico)}<span>${esc(item.label)}</span></a>`;
  }).join('');
  return `${tabs}<button type="button" id="moreTab"${inMore ? ' aria-current="page"' : ''}
    aria-haspopup="dialog">${icon('menu')}<span>More</span></button>`;
}

/** The sheet behind the More tab. */
function moreSheet() {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal sheet';
  dlg.innerHTML = `
    <div class="card card-pad-lg stack" style="gap:14px">
      <div class="row-between">
        <h3>More</h3>
        <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <nav class="more-grid" aria-label="More sections">
        ${overflow().map(i => `<a href="${i.href}"${i.href === here() ? ' aria-current="page"' : ''}>
          ${icon(i.ico)}<span>${esc(i.label)}</span></a>`).join('')}
      </nav>
    </div>`;
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
}

/**
 * An avatar URL we are willing to put in a `src`.
 *
 * Pictures now arrive from other people's public profiles, so this is
 * attacker-controlled input. Only absolute https is allowed:
 *
 *   `javascript:` cannot execute from an `<img src>`, but it has no business
 *   being here and the next person to copy this helper into an `<a href>`
 *   should not inherit the problem.
 *   `data:` would let somebody store a megabyte of image inside a document
 *   that is meant to be a few hundred bytes, and have every viewer download it.
 *   `http:` is a mixed-content warning and a cleartext beacon.
 *
 * The length cap is the same argument as the rules' cap: a URL is a name, not
 * a payload.
 */
export function safePicture(url) {
  const s = String(url ?? '').trim();
  if (!s) return '';

  /*
   * An uploaded avatar is a `data:image/...` URL in this device's own store,
   * and it has to render — this filter being https-only is what made a
   * profile picture vanish and fall back to initials on every re-render,
   * which looked like the theme switch eating it.
   *
   * Allowing it here is safe and is not the same decision as publishing it.
   * A data URL in an `<img src>` cannot execute; the image types are named
   * explicitly so `data:text/html` is not one of them; and the length is
   * bounded because a local avatar is ~25 KB, not a video. Whether one is
   * ever *published* is a separate question answered in core/social.js by
   * `publicPicture`, which stays https-only.
   */
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) {
    return s.length <= 200_000 ? s : '';
  }

  // Everything else must be absolute https. `javascript:` cannot run from an
  // `<img src>`, but it has no business here and the next person to reuse
  // this helper on an `<a href>` should not inherit the problem.
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && s.length <= 500 ? u.href : '';
  } catch { return ''; }
}

/**
 * An avatar, with initials behind it if the image does not load.
 *
 * No inline `onerror`. It used to build one out of the person's own initials,
 * which put attacker-controlled text inside a JavaScript string inside an
 * HTML attribute — two layers of parsing, each with its own escaping rules,
 * and `esc()` only gets the outer one right. `&#39;` is decoded back to a
 * quote by the HTML parser *before* the JS is parsed, so an apostrophe in a
 * name broke out of the string. `initials()` truncates to two characters,
 * which is what stopped it being executable, which is not a security control
 * anybody should be relying on.
 *
 * The fallback is a delegated listener instead — see `wireAvatarFallback`.
 * The initials ride along in a plain data attribute, where `esc()` is
 * sufficient because there is only one parser involved.
 */
function avatarHtml(user, cls = 'avatar') {
  const ini = esc(initials(user?.name ?? 'Guest'));
  const src = safePicture(user?.picture);
  if (src) {
    return `<img class="${cls} avatar-img" src="${esc(src)}" alt="" loading="lazy"
      referrerpolicy="no-referrer" data-ini="${ini}">`;
  }
  return `<div class="${cls}">${ini}</div>`;
}
export { avatarHtml };

/**
 * Swap a broken avatar for its initials, once, for the whole document.
 *
 * `error` does not bubble, so this listens in the capture phase. One listener
 * replaces an inline handler on every avatar on the page, and there is no
 * string of JavaScript being assembled from somebody's display name.
 */
let avatarWired = false;
export function wireAvatarFallback() {
  if (avatarWired) return;
  avatarWired = true;
  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('avatar-img')) return;
    const span = document.createElement('div');
    span.className = img.className.replace('avatar-img', '').trim();
    span.textContent = img.dataset.ini || '?';
    img.replaceWith(span);
  }, true);
}

/**
 * Build the sidebar + topbar + tab bar around the page's `#view` element.
 * @param {{title:string, actions?:string}} opts
 */
export function mountShell({ title, actions = '' }) {
  wireAvatarFallback();

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
    const u = auth.signedIn ? displayUser() : { name: 'Guest', provider: 'guest' };
    chip.innerHTML = `${avatarHtml(u, 'avatar avatar-sm')}
      <div style="min-width:0;line-height:1.25">
        <div style="font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name)}</div>
        <div class="dim" style="font-size:.68rem">${u.provider === 'google' ? 'Google account' : 'On this device'}</div>
      </div>`;
  };
  auth.onChange(syncUser);
  // A nickname change is a store change, not an auth change — without this the
  // header keeps the old name until the next full page load.
  store.onChange(syncUser);
  syncUser();

  shell.querySelector('#moreTab')?.addEventListener('click', moreSheet);

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

  // Keep the public profile in step, on boot and on every change after it.
  //
  // Subscribing to the store rather than only running once is what makes a
  // new nickname or picture reach other people straight away instead of on
  // their next page load. It is not chatty: `shouldPublish` reads a throttle
  // record out of localStorage and returns false without touching the network
  // for everything except an identity change or an hourly stat refresh, so
  // logging a set costs nothing here.
  if (auth.uid) {
    import('./social.js').then(m => {
      const push = () => m.syncPublicProfile(auth.uid, store.data, store.stats());
      push();
      store.onChange(push);
    }).catch(() => {});
  }

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
