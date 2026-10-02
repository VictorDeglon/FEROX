/**
 * Somebody's public profile: `u.html?h=victor`.
 *
 * Everything on this page comes from `profiles/{uid}`, which holds only the
 * fields named in `PUBLIC_FIELDS`. Nothing here reaches into anyone's private
 * log — it could not, because `firestore.rules` refuses, and that is the
 * point: the page is safe by construction rather than by remembering not to
 * render the wrong field.
 *
 * Two reads to open one: the handle, then the profile. Visiting your own is
 * the same page as everybody else's, with an edit button, so what you see is
 * exactly what other people see.
 */
import { brandMark, icon } from '../core/icons.js';
import { esc, num, avatarHtml, wireAvatarFallback } from '../core/ui.js';

wireAvatarFallback();
import { auth } from '../core/auth.js';
import { profileByHandle, normaliseHandle } from '../core/social.js';
import { googleReady, CONFIG } from '../core/config.js';
import { weight as toDisplay, weightLabel } from '../core/units.js';

/**
 * The *viewer's* units, not the profile owner's — an American looking at a
 * European's profile should read pounds. Taken straight from localStorage
 * rather than booting the whole data layer, because this page has no other
 * reason to load an athlete's log.
 */
const U = (() => {
  try {
    const d = JSON.parse(localStorage.getItem(CONFIG.storageKey) ?? 'null');
    if (d?.profile?.unit) return d.profile.unit === 'lb' ? 'lb' : 'kg';
    return localStorage.getItem('ferox.v2.unit') === 'lb' ? 'lb' : 'kg';
  } catch { return 'kg'; }
})();

document.getElementById('mark').innerHTML = brandMark(30);

const pane = document.getElementById('pane');
const wanted = normaliseHandle(new URLSearchParams(location.search).get('h') ?? '');

const card = inner => `<div class="card card-pad-lg stack" style="gap:14px">${inner}</div>`;

function message(title, body, cta = true) {
  pane.innerHTML = card(`
    <h1 style="font-size:var(--step-2)">${esc(title)}</h1>
    <p class="muted" style="font-size:var(--step--1)">${esc(body)}</p>
    ${cta ? `<a class="btn btn-primary" style="justify-self:start" href="./">Open FEROX</a>` : ''}`);
}

/**
 * This built its own inline `onerror` with `JSON.stringify` inside a
 * double-quoted attribute — JSON's own quotes closed the attribute. It uses
 * the shared helper now, which has no inline handler at all.
 */
function avatar(p, size = 72) {
  const box = `width:${size}px;height:${size}px;font-size:${Math.round(size / 2.8)}px`;
  return `<span style="${box};display:inline-grid">
    ${avatarHtml({ name: p.nickname || p.handle, picture: p.picture }, 'avatar')}</span>`;
}

const tile = (label, value, note = '') => `
  <div class="stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value">${esc(String(value))}</span>
    ${note ? `<span class="dim" style="font-size:.72rem">${esc(note)}</span>` : ''}
  </div>`;

function render(p, isMe) {
  document.title = `@${p.handle} · FEROX`;
  const joined = p.joined
    ? new Date(p.joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  pane.innerHTML = `
    ${card(`
      <div class="row" style="gap:14px;align-items:center">
        ${avatar(p)}
        <div class="grow" style="min-width:0">
          <h1 style="font-size:var(--step-1);overflow:hidden;text-overflow:ellipsis">
            ${esc(p.nickname || p.handle)}</h1>
          <p class="dim" style="font-size:var(--step--1)">@${esc(p.handle)}</p>
          ${joined ? `<p class="dim" style="font-size:.76rem;margin-top:2px">Training here since ${esc(joined)}</p>` : ''}
        </div>
        ${isMe
          ? `<a class="btn btn-sm" href="profile.html">${icon('settings')}<span>Edit</span></a>`
          : ''}
      </div>`)}

    ${card(`
      <div class="grid grid-2" style="gap:12px">
        ${tile('Streak', `${p.streak ?? 0}`, p.streak === 1 ? 'day' : 'days')}
        ${tile('Sessions', num(p.sessions ?? 0), 'logged')}
        ${tile('Volume', num(toDisplay(p.volume ?? 0, U, { decimals: 0 })), `${weightLabel(U)} lifted`)}
        ${tile('Medals', num(p.medals ?? 0), 'earned')}
        ${tile('Friends', num(p.friends ?? 0), p.friends === 1 ? 'athlete' : 'athletes')}
      </div>
      <p class="dim" style="font-size:.74rem">
        Streak, sessions, volume, medals and a friend count are the only things a profile shows.
        Bodyweight, measurements and everything eaten stay private.</p>`)}

    ${isMe ? '' : card(`
      <p class="muted" style="font-size:var(--step--1)">
        Track your own training the same way — free, no account needed to start.</p>
      <a class="btn btn-primary" style="justify-self:start" href="./">Open FEROX</a>`)}`;
}

/* ------------------------------------------------------------------ boot */

if (!wanted) {
  message('No athlete named', 'This link is missing a handle. Profiles look like /u.html?h=victor.');
} else if (!googleReady()) {
  message('Profiles are not switched on', 'This deployment has no Firebase project behind it, so there is nobody to look up.');
} else {
  // A profile is readable by signed-in people only, which is also what stops
  // the whole directory being scraped. Restore first so a returning visitor
  // is not told to sign in when they already have.
  await auth.restore().catch(() => {});

  if (!auth.uid) {
    message('Sign in to see profiles',
      `@${wanted} may well be here. Profiles are visible to people with an account, which is what keeps the list of everyone off the open web.`);
  } else {
    try {
      const p = await profileByHandle(wanted);
      if (!p) message('Nobody here', `No athlete has claimed @${wanted}.`);
      else render(p, p.uid === auth.uid);
    } catch (err) {
      console.warn('[ferox] profile load failed:', err?.code ?? err);
      message('Could not load that profile', 'Check your connection and try again.');
    }
  }
}
