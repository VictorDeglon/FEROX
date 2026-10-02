/** Friends — the training leaderboard. */
import { store } from '../core/store.js';
import { bootPage, esc, num, toast, modal, confirmDialog, avatarHtml, initials, displayName } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { auth } from '../core/auth.js';
import { searchPeople, profilesByUid, recommendPeople, publicProfileFrom,
  requestFriend, acceptFriend, removeFriendship, myFriendships,
  ensureMessagingKey } from '../core/social.js';
import { openChat } from './_chat.js';
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

// Reconcile with the server once, on open: accepted relationships in,
// removed ones out. `store.commit` re-renders, so the board fills in a
// moment after it paints rather than blocking on it.
syncAcceptedFriends().catch(() => {});
// A key is only generated for someone who has reached this page — a guest,
// or anybody who never opens friends, never pays for one.
ensureMessagingKey(auth.uid, store.data.profile).catch(() => {});

function render(el) {
  const s = store.stats();
  const me = {
    id: 'me', you: true,
    name: displayName(),
    handle: store.data.profile.handle,
    picture: store.data.profile.picture || auth.user?.picture || '',
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
                    ${p.handle
                      ? `<a href="u.html?h=${encodeURIComponent(p.handle)}" style="color:inherit">
                           <strong>${esc(p.name)}</strong></a>`
                      : `<strong>${esc(p.name)}</strong>`}
                    ${p.you ? ' <span class="chip chip-ember" style="padding:1px 7px;font-size:.64rem">You</span>' : ''}
                    <br><small class="dim">@${esc(p.handle ?? 'athlete')}</small>
                  </div>
                </div>
              </td>
              <td style="text-align:right" class="num"><strong>${esc(m.fmt(p[m.key] ?? 0))}</strong></td>
              <td style="text-align:right">${p.you ? '' : `
                ${p.uid ? `<button class="btn btn-ghost btn-sm" data-dm="${esc(p.uid)}"
                   aria-label="Message ${esc(p.name)}">${icon('link')}</button>` : ''}
                <button class="btn btn-ghost btn-sm" data-rm="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('trash')}</button>`}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad-lg" id="reqCard" hidden>
          <div class="card-head"><h3>Requests</h3></div>
          <div class="stack" style="gap:8px;margin-top:10px" id="reqList"></div>
        </div>

        <div class="card card-pad-lg">
          <div class="card-head">
            <h3>People to train with</h3>
            <span class="dim" style="font-size:var(--step--2)">suggested</span>
          </div>
          <div class="stack" style="gap:8px;margin-top:10px" id="sugList">
            <p class="dim" style="font-size:.78rem">Looking…</p>
          </div>
        </div>

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

  const sug = el.querySelector('#sugList');
  if (sug) renderSuggestions(sug).catch(() => { sug.innerHTML = ''; });

  renderRequests(el).catch(() => {});

  el.querySelectorAll('[data-m]').forEach(b =>
    b.addEventListener('click', () => { metric = b.dataset.m; render(el); }));
  el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
    const row = store.data.friends.find(f => f.id === b.dataset.rm);
    if (!await confirmDialog('Remove friend?',
      'They come off your leaderboard and neither of you can message the other. You can ask again any time.')) return;
    // Drop the relationship too, not just the local row — otherwise they are
    // gone from your board and you are still on theirs, still able to message.
    if (row?.uid && auth.uid) await removeFriendship(auth.uid, row.uid).catch(() => {});
    await store.removeFriend(b.dataset.rm);
    toast('Friend removed');
  }));

  el.querySelectorAll('[data-dm]').forEach(b => b.addEventListener('click', () => {
    const f = store.data.friends.find(x => x.uid === b.dataset.dm);
    if (f) openChat({ uid: f.uid, handle: f.handle, nickname: f.name, pk: f.pk });
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
        // A request, not an add. Nobody appears on anybody's list, and no
        // message can be sent, until both people have agreed.
        const state = await requestFriend(auth.uid, b.dataset.add).catch(() => null);
        already.add(b.dataset.add);
        b.replaceWith(Object.assign(document.createElement('span'), {
          className: 'chip' + (state === 'accepted' ? ' chip-ok' : ''),
          textContent: state === 'accepted' ? 'Friends' : 'Requested',
        }));
        toast(state === 'accepted'
          ? 'They had already asked you — you are connected'
          : 'Request sent', 'ok');
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

/* ------------------------------------------------------------ suggestions */

/**
 * People worth training alongside.
 *
 * Rendered after the board rather than with it, because it needs the network
 * and the leaderboard does not — the page should never wait on this.
 *
 * It aims for five every time and falls back to whoever is training when
 * there are not five matches, because "no suggestions" on a young app is a
 * section nobody opens twice. Fewer than five only happens when the app
 * genuinely has fewer than five other athletes.
 */
async function renderSuggestions(host) {
  if (!auth.uid || !store.data.profile.handle) { host.innerHTML = ''; return; }

  const me = publicProfileFrom(store.data, store.stats(), auth.uid);
  if (me.discoverable === false) {
    host.innerHTML = `<p class="dim" style="font-size:.78rem">
      Suggestions are off while you are not discoverable. Turn it back on in your profile.</p>`;
    return;
  }

  const skip = new Set([auth.uid, ...store.data.friends.map(f => f.uid).filter(Boolean)]);
  let rows = [];
  try { rows = await recommendPeople(me, skip, 5); } catch { /* offline */ }

  if (!rows.length) {
    host.innerHTML = `<p class="dim" style="font-size:.78rem">
      Nobody to suggest yet — FEROX is still small. Search by handle if you know somebody.</p>`;
    return;
  }

  host.innerHTML = rows.map(r => `
    <div class="row-between" style="gap:10px;padding:9px;border:1px solid var(--line);
         border-radius:var(--r-md);background:var(--surf-1)">
      <a class="row" style="gap:9px;min-width:0;align-items:center;text-decoration:none;color:inherit"
         href="u.html?h=${encodeURIComponent(r.handle)}">
        ${avatarHtml({ name: r.nickname || r.handle, picture: r.picture }, 'avatar avatar-sm')}
        <span style="min-width:0">
          <span style="display:block;font-size:.85rem;font-weight:600;overflow:hidden;
                       text-overflow:ellipsis;white-space:nowrap">${esc(r.nickname || r.handle)}</span>
          <span class="dim" style="font-size:.72rem">@${esc(r.handle)} · ${esc(r.why)}</span>
        </span>
      </a>
      <button type="button" class="btn btn-sm" data-sug="${esc(r.uid)}"
        data-handle="${esc(r.handle)}" data-name="${esc(r.nickname || r.handle)}"
        data-pic="${esc(r.picture ?? '')}">Add</button>
    </div>`).join('');

  host.onclick = async e => {
    const b = e.target.closest('[data-sug]');
    if (!b) return;
    b.disabled = true;
    const state = await requestFriend(auth.uid, b.dataset.sug).catch(() => null);
    toast(state === 'accepted' ? 'You are connected' : 'Request sent', 'ok');
    renderSuggestions(host);        // refill the slot they just used
  };
}

/* --------------------------------------------------------------- requests */

/**
 * Incoming and outgoing requests.
 *
 * One `array-contains` query returns every relationship this account is part
 * of, pending and accepted together, so the card costs the same one read
 * whether there is anything in it or not — and the leaderboard below it is
 * built from the same answer rather than a second trip.
 */
async function renderRequests(el) {
  const card = el.querySelector('#reqCard');
  const list = el.querySelector('#reqList');
  if (!card || !auth.uid) return;

  const { incoming, outgoing } = await myFriendships(auth.uid);
  if (!incoming.length && !outgoing.length) { card.hidden = true; return; }

  const uids = [...incoming, ...outgoing].map(r => r.other);
  const people = new Map((await profilesByUid(uids)).map(p => [p.uid, p]));
  const name = u => people.get(u)?.nickname || people.get(u)?.handle || 'Athlete';
  const at = u => people.get(u)?.handle ?? '';

  const row = (r, kind) => `
    <div class="row-between" style="gap:10px;padding:9px;border:1px solid var(--line);
         border-radius:var(--r-md);background:var(--surf-1)">
      <a class="row" style="gap:9px;min-width:0;align-items:center;text-decoration:none;color:inherit"
         href="u.html?h=${encodeURIComponent(at(r.other))}">
        ${avatarHtml({ name: name(r.other), picture: people.get(r.other)?.picture }, 'avatar avatar-sm')}
        <span style="min-width:0">
          <span style="display:block;font-size:.85rem;font-weight:600">${esc(name(r.other))}</span>
          <span class="dim" style="font-size:.72rem">
            ${kind === 'in' ? 'wants to connect' : 'request sent'}</span>
        </span>
      </a>
      <span class="row" style="gap:6px">
        ${kind === 'in'
          ? `<button type="button" class="btn btn-sm btn-primary" data-accept="${esc(r.other)}">Accept</button>
             <button type="button" class="btn btn-sm btn-ghost" data-drop="${esc(r.other)}">Decline</button>`
          : `<button type="button" class="btn btn-sm btn-ghost" data-drop="${esc(r.other)}">Cancel</button>`}
      </span>
    </div>`;

  card.hidden = false;
  list.innerHTML = [...incoming.map(r => row(r, 'in')),
    ...outgoing.map(r => row(r, 'out'))].join('');

  list.onclick = async e => {
    const acc = e.target.closest('[data-accept]');
    const drop = e.target.closest('[data-drop]');
    if (!acc && !drop) return;
    e.target.disabled = true;
    try {
      if (acc) { await acceptFriend(auth.uid, acc.dataset.accept); toast('Connected', 'ok'); }
      else { await removeFriendship(auth.uid, drop.dataset.drop); toast('Removed', 'ok'); }
    } catch (err) {
      toast('That did not work', 'bad');
      console.info('[ferox] request action:', err?.code ?? err);
      e.target.disabled = false;
      return;
    }
    renderRequests(el);
    await syncAcceptedFriends();
  };
}

/**
 * Bring the local friends list in line with accepted relationships.
 *
 * The leaderboard reads `store.data.friends`, which is local and offline, and
 * the relationships live in Firestore. This is the one place they are
 * reconciled: accepted relationships are added, and anything whose
 * relationship has gone — declined, unfriended from the other side — is
 * dropped, so a leaderboard never shows somebody who removed you.
 */
async function syncAcceptedFriends() {
  if (!auth.uid) return false;
  const { accepted } = await myFriendships(auth.uid);
  const live = new Set(accepted.map(r => r.other));
  const people = new Map((await profilesByUid([...live])).map(p => [p.uid, p]));

  return store.commit(d => {
    // Anybody whose relationship no longer exists comes off the board. Only
    // rows with a uid are touched — hand-entered friends from before this
    // existed are left alone rather than silently deleted.
    d.friends = d.friends.filter(f => !f.uid || live.has(f.uid));

    for (const uid of live) {
      const p = people.get(uid);
      if (!p) continue;
      const row = d.friends.find(f => f.uid === uid);
      const next = {
        uid, handle: p.handle ?? '', name: p.nickname || p.handle || 'Athlete',
        picture: p.picture ?? '', pk: p.pk ?? '',
        streak: p.streak ?? 0, sessions: p.sessions ?? 0,
        volume: p.volume ?? 0, medals: p.medals ?? 0,
      };
      if (row) Object.assign(row, next);
      else d.friends.push({ id: `fr-${uid}`, ...next });
    }
  });
}
