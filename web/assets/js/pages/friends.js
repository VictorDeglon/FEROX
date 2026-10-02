/** Friends — the training leaderboard. */
import { store } from '../core/store.js';
import { bootPage, esc, num, toast, modal, confirmDialog, avatarHtml, initials } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { searchPeople, profilesByUid } from '../core/social.js';
import { weight as toDisplay, weightLabel } from '../core/units.js';
import { handleFlow } from './_handle.js';

let metric = 'streak';

const METRICS = {
  streak:   { label: 'Streak',  fmt: v => `${v} days`,  key: 'streak' },
  sessions: { label: 'Sessions', fmt: v => num(v),      key: 'sessions' },
  volume:   { label: 'Volume',  fmt: v => `${num(toDisplay(v, store.unit, { decimals: 0 }))} ${weightLabel(store.unit)}`, key: 'volume' },
  medals:   { label: 'Medals',  fmt: v => num(v),       key: 'medals' },
};

const ordinal = n => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

const view = await bootPage({
  title: 'Friends',
  actions: `<button class="btn btn-primary btn-sm" id="addBtn">${icon('plus')}<span>Add friend</span></button>`,
}, render);

document.getElementById('addBtn').addEventListener('click', addFriendFlow);

// Pull friends' public numbers once, on open. `store.commit` re-renders, so
// the board fills in a moment after it paints rather than blocking on it.
refreshFriends().catch(() => {});

function render(el) {
  const s = store.stats();
  const me = {
    id: 'me', you: true,
    name: auth.user?.name ?? store.data.profile.name,
    handle: store.data.profile.handle,
    picture: auth.user?.picture ?? '',
    streak: s.streak, sessions: s.sessions, volume: Math.round(s.volume), medals: store.data.medals.length,
  };

  const m = METRICS[metric];
  const board = [me, ...store.data.friends].sort((a, b) => (b[m.key] ?? 0) - (a[m.key] ?? 0));
  const myRank = board.findIndex(p => p.you) + 1;

  el.innerHTML = `
    <div class="row-between wrap" style="gap:12px">
      <div>
        <h2 style="font-size:1.1rem">Leaderboard</h2>
        <p class="dim" style="font-size:.84rem;margin-top:3px">
          You're ${ordinal(myRank)} of ${board.length} on ${m.label.toLowerCase()}.</p>
      </div>
      <div class="seg">
        ${Object.entries(METRICS).map(([k, v]) =>
          `<button data-m="${k}" aria-pressed="${metric === k}">${esc(v.label)}</button>`).join('')}
      </div>
    </div>

    <section class="grid grid-main">
      <div class="card card-pad-lg">
        <div class="table-wrap"><table class="data">
          <thead><tr><th style="width:44px">#</th><th>Athlete</th><th style="text-align:right">${esc(m.label)}</th><th></th></tr></thead>
          <tbody>${board.map((p, i) => `
            <tr style="${p.you ? 'background:var(--ember-soft)' : ''}">
              <td class="num" style="font-family:var(--font-display);font-weight:800;color:${i < 3 ? 'var(--ember)' : 'var(--text-3)'}">${i + 1}</td>
              <td>
                <div class="row" style="gap:10px">
                  ${avatarHtml(p, 'avatar avatar-sm')}
                  <div style="min-width:0">
                    <strong>${esc(p.name)}</strong>${p.you ? ' <span class="chip chip-ember" style="padding:1px 7px;font-size:.64rem">You</span>' : ''}
                    <br><small class="dim">@${esc(p.handle ?? 'athlete')}</small>
                  </div>
                </div>
              </td>
              <td style="text-align:right" class="num"><strong>${esc(m.fmt(p[m.key] ?? 0))}</strong></td>
              <td style="text-align:right">${p.you ? '' :
                `<button class="btn btn-ghost btn-sm" data-rm="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('trash')}</button>`}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg">
          <div class="card-head"><h3>Your standing</h3></div>
          <div class="stack" style="gap:11px">
            ${Object.entries(METRICS).map(([k, v]) => {
              const rank = [me, ...store.data.friends].sort((a, b) => (b[v.key] ?? 0) - (a[v.key] ?? 0)).findIndex(p => p.you) + 1;
              return `<div class="row-between" style="font-size:.86rem">
                <span class="muted">${esc(v.label)}</span>
                <span class="row" style="gap:9px">
                  <span class="num">${esc(v.fmt(me[v.key]))}</span>
                  <span class="chip ${rank === 1 ? 'chip-ok' : ''}">${ordinal(rank)}</span>
                </span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head"><h3>How this works</h3></div>
          <p class="muted" style="font-size:.86rem">
            Friends are stored on this device while FEROX runs without a server. Connect the API
            and the same list syncs across devices — nothing else about this page changes.</p>
          <p class="dim" style="font-size:.78rem;margin-top:10px">
            Add three friends to unlock the <strong>Training Partners</strong> medal.</p>
        </div>
      </div>
    </section>`;

  el.querySelectorAll('[data-m]').forEach(b =>
    b.addEventListener('click', () => { metric = b.dataset.m; render(el); }));
  el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
    if (await confirmDialog('Remove friend?', 'They come off your leaderboard. You can add them again any time.')) {
      await store.removeFriend(b.dataset.rm);
      toast('Friend removed');
    }
  }));
}

/**
 * Find a real, registered athlete by handle.
 *
 * Prefix search over `handles`, which is a key range rather than a query, so
 * a search costs one read per result shown and needs no index — see
 * core/social.js for why that shape was chosen.
 *
 * A guest cannot search at all, and says so plainly rather than offering a
 * box that returns nothing: profiles are readable by signed-in accounts only,
 * which is also what keeps the directory of everybody off the open web.
 */
async function addFriendFlow() {
  if (!auth.uid) {
    const go = await confirmDialog('Sign in to find people',
      'Friends are real FEROX accounts, so finding them needs one. Your training stays yours either way.',
      { danger: false });
    if (go) location.href = 'profile.html';
    return;
  }
  if (!store.data.profile.handle) {
    const go = await confirmDialog('Claim your handle first',
      'People find each other by handle, so you need one before you can add anybody.',
      { danger: false });
    if (go) await handleFlow({ first: true });
    return;
  }

  const already = new Set(store.data.friends.map(f => f.uid).filter(Boolean));

  await modal({
    title: 'Find an athlete',
    submit: 'Done',
    cancel: 'Close',
    body: `
      <div class="field">
        <label for="fq">Search by handle</label>
        <input class="input" id="fq" autocomplete="off" autocapitalize="off" spellcheck="false"
          placeholder="sam_lifts" inputmode="search">
      </div>
      <div id="fres" class="stack" style="gap:8px;min-height:84px">
        <p class="dim" style="font-size:.8rem">Type at least two characters.</p>
      </div>`,

    onMount(dlg) {
      const input = dlg.querySelector('#fq');
      const out = dlg.querySelector('#fres');
      let timer = null;
      let token = 0;

      const row = r => `
        <div class="row-between" style="gap:10px;padding:8px;border:1px solid var(--line);
             border-radius:var(--r-md);background:var(--surf-1)">
          <a class="row" style="gap:9px;min-width:0;align-items:center;text-decoration:none;color:inherit"
             href="u.html?h=${encodeURIComponent(r.handle)}">
            ${avatarHtml({ name: r.nickname || r.handle, picture: r.picture }, 'avatar avatar-sm')}
            <span style="min-width:0">
              <span style="display:block;font-size:.86rem;font-weight:600;overflow:hidden;
                           text-overflow:ellipsis;white-space:nowrap">${esc(r.nickname || r.handle)}</span>
              <span class="dim" style="font-size:.74rem">@${esc(r.handle)}</span>
            </span>
          </a>
          ${already.has(r.uid)
            ? `<span class="chip chip-ok">Added</span>`
            : `<button type="button" class="btn btn-sm btn-primary" data-add="${esc(r.uid)}"
                 data-handle="${esc(r.handle)}" data-name="${esc(r.nickname || r.handle)}"
                 data-pic="${esc(r.picture ?? '')}">Add</button>`}
        </div>`;

      const run = async () => {
        const q = input.value.trim();
        if (q.length < 2) {
          out.innerHTML = `<p class="dim" style="font-size:.8rem">Type at least two characters.</p>`;
          return;
        }
        out.innerHTML = `<p class="dim" style="font-size:.8rem">Searching…</p>`;
        const mine = ++token;
        let rows = [];
        try { rows = await searchPeople(q, { limit: 8, exclude: auth.uid }); }
        catch { if (mine === token) out.innerHTML = `<p class="dim" style="font-size:.8rem">Search failed — check your connection.</p>`; return; }
        if (mine !== token) return;          // a later keystroke already won

        out.innerHTML = rows.length
          ? rows.map(row).join('')
          : `<p class="dim" style="font-size:.8rem">Nobody with a handle starting “${esc(q)}”.</p>`;
      };

      input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });

      out.addEventListener('click', async e => {
        const b = e.target.closest('[data-add]');
        if (!b) return;
        b.disabled = true;
        await store.addFriend({
          uid: b.dataset.add,
          handle: b.dataset.handle,
          name: b.dataset.name,
          picture: b.dataset.pic,
          streak: 0, sessions: 0, volume: 0, medals: 0,
        });
        already.add(b.dataset.add);
        b.replaceWith(Object.assign(document.createElement('span'),
          { className: 'chip chip-ok', textContent: 'Added' }));
        toast('Added — their numbers refresh next time you open this page', 'ok');
      });

      input.focus();
    },
  });
}

/**
 * Refresh saved friends from their public profiles.
 *
 * One read each, only for friends who are real accounts, and only on opening
 * this page — a leaderboard does not need to be live to the second, and
 * polling it would be the most expensive thing in the app.
 */
async function refreshFriends() {
  const uids = store.data.friends.map(f => f.uid).filter(Boolean);
  if (!uids.length || !auth.uid) return false;
  let rows = [];
  try { rows = await profilesByUid(uids); } catch { return false; }
  if (!rows.length) return false;

  const by = new Map(rows.map(r => [r.uid, r]));
  let changed = false;
  await store.commit(d => {
    for (const f of d.friends) {
      const r = f.uid && by.get(f.uid);
      if (!r) continue;
      // Their nickname and picture are theirs to change, so take those too.
      const next = { name: r.nickname || f.name, handle: r.handle ?? f.handle,
        picture: r.picture ?? f.picture, streak: r.streak ?? 0,
        sessions: r.sessions ?? 0, volume: r.volume ?? 0, medals: r.medals ?? 0 };
      if (Object.entries(next).some(([k, v]) => f[k] !== v)) { Object.assign(f, next); changed = true; }
    }
  });
  return changed;
}

