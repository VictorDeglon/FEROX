/**
 * Shared UI: the app shell, theme, toasts, modals and formatting helpers.
 * Every app page calls `mountShell()` once and then renders into `#view`.
 */
import { CONFIG } from './config.js';
import { icon, brandMark, social, SOCIALS } from './icons.js';
import { auth } from './auth.js';
import { store } from './store.js';

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

export function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(CONFIG.themeKey); } catch { /* ignore */ }
  if (saved) document.documentElement.dataset.theme = saved;
  return saved ?? 'dark';
}
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(CONFIG.themeKey, next); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent('ferox:theme', { detail: next }));
  return next;
}
initTheme();

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
export function modal({ title, body, submit = 'Save', cancel = 'Cancel', wide = false }) {
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
    dlg.showModal();
    dlg.querySelector('input, select, textarea')?.focus();
  });
}

export function confirmDialog(title, message, { danger = true } = {}) {
  return modal({ title, body: `<p class="muted" style="font-size:.9rem">${esc(message)}</p>`, submit: danger ? 'Delete' : 'Confirm' })
    .then(r => r !== null);
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
    const light = document.documentElement.dataset.theme === 'light';
    themeBtn.innerHTML = `${icon(light ? 'sun' : 'moon')}<span>${light ? 'Light' : 'Dark'}</span>`;
  };
  themeBtn.addEventListener('click', () => { toggleTheme(); syncTheme(); });
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
      FEROX is a tracking tool, not medical advice. Free, open source, and your data stays on your device.</p>
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
  requireSession();
  const view = mountShell({ title, actions });
  view.innerHTML = `<div class="grid grid-3">${'<div class="skel" style="height:118px"></div>'.repeat(3)}</div>`;
  await store.init({ token: auth.token });

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
