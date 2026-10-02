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
import { pacerByHandle } from '../core/pacers.js';
import { decorate, isAutumn } from '../core/seasonal.js';
import { PROFILE_ACCENTS, accentById } from '../core/social.js';
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
function avatar(p, size = 104) {
  /*
   * The size goes on the avatar element itself, not on a wrapper around it.
   * `.avatar` is 34px by default, so wrapping it in a 104px box left a small
   * circle in the corner of a large one — which, with the October frame
   * centred on the *wrapper*, read as the decoration being misaligned when
   * it was the avatar that was.
   */
  const inner = avatarHtml({ name: p.nickname || p.handle, picture: p.picture },
    'avatar avatar-xl');
  // October hangs leaves off the frame. Outside it, this returns `inner`
  // untouched — see core/seasonal.js.
  return decorate(inner, size, { seed: p.handle ?? '' });
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

  /*
   * The accent is the one thing an athlete chooses about how their page
   * looks. One short string on the public document, used for the banner
   * wash, the rule under the name and the stat values — enough to make a
   * page feel like somebody's without letting anybody build something
   * unreadable, which is what a free colour picker always ends up being.
   */
  const accent = p.pacer ? (p.accent || accentById().hex) : accentById(p.accent).hex;
  document.documentElement.style.setProperty('--u-accent', accent);

  const stat = (label, value, note) => `
    <div class="u-stat">
      <span class="u-stat-v">${esc(String(value))}</span>
      <span class="u-stat-l">${esc(label)}</span>
      ${note ? `<span class="u-stat-n">${esc(note)}</span>` : ''}
    </div>`;

  pane.innerHTML = `
    <section class="u-hero">
      <div class="u-wash" aria-hidden="true"></div>
      <div class="u-id">
        ${avatar(p)}
        <h1 class="u-name">${esc(p.nickname || p.handle)}</h1>
        <p class="u-handle">@${esc(p.handle)}</p>
        ${p.pacer ? `<span class="chip chip-pacer">FEROX pacer</span>` : ''}
        ${p.place ? `<p class="u-meta">${esc(p.place)}</p>` : ''}
        ${p.tagline ? `<p class="u-tagline">${esc(p.tagline)}</p>` : ''}
        ${joined ? `<p class="u-meta">Training here since ${esc(joined)}</p>` : ''}
        ${isMe ? `<a class="btn btn-sm" style="margin-top:12px" href="profile.html">
          ${icon('settings')}<span>Edit your page</span></a>` : ''}
      </div>
    </section>

    <section class="u-stats">
      ${stat('Streak', p.streak ?? 0, (p.streak === 1 ? 'day' : 'days'))}
      ${stat('Sessions', num(p.sessions ?? 0), 'logged')}
      ${stat('Volume', num(toDisplay(p.volume ?? 0, U, { decimals: 0 })), `${weightLabel(U)} lifted`)}
      ${stat('Medals', num(p.medals ?? 0), 'earned')}
      ${stat('Friends', num(p.friends ?? 0), p.friends === 1 ? 'athlete' : 'athletes')}
    </section>

    ${p.pacer ? `<div class="card card-pad-lg stack" style="gap:10px">
      <p class="muted" style="font-size:var(--step--1)">${esc(p.bio)}</p>
      <p class="dim" style="font-size:.8rem">${esc(p.style)}</p>
      <p class="dim" style="font-size:.74rem;border-top:1px solid var(--line);padding-top:10px">
        <strong>${esc(p.nickname)} is a pacer, not a person.</strong> A character to train
        against, with a pace deliberately just ahead of yours. Nobody is behind the account,
        it cannot be messaged, and pacers switch off on the Friends page.</p>
    </div>` : ''}

    <p class="dim" style="font-size:.74rem;text-align:center;max-width:46ch;margin:0 auto">
      A profile shows a streak, sessions, volume, medals and a friend count. Bodyweight,
      measurements and everything eaten stay private.</p>

    ${isMe || p.pacer ? '' : `<div class="card card-pad-lg stack" style="gap:12px">
      <p class="muted" style="font-size:var(--step--1)">
        Track your own training the same way — free, and no account needed to start.</p>
      <a class="btn btn-primary" style="justify-self:start" href="./">Open FEROX</a>
    </div>`}`;
}

/* ------------------------------------------------------------------ boot */

if (!wanted) {
  message('No athlete named', 'This link is missing a handle. Profiles look like /u.html?h=victor.');
} else if (!googleReady()) {
  message('Profiles are not switched on', 'This deployment has no Firebase project behind it, so there is nobody to look up.');
} else if (pacerByHandle(wanted)) {
  // Pacers are computed, not stored, so their page needs no account and no
  // read — and it says plainly what they are rather than leaving somebody to
  // work out why this athlete never replies.
  render(pacerByHandle(wanted), false);
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
