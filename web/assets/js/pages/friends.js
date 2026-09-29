/** Friends — the pack leaderboard. */
import { store } from '../core/store.js';
import { bootPage, esc, num, toast, modal, confirmDialog, avatarHtml, initials } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { auth } from '../core/auth.js';

let metric = 'streak';

const METRICS = {
  streak:   { label: 'Streak',  fmt: v => `${v} days`,  key: 'streak' },
  sessions: { label: 'Sessions', fmt: v => num(v),      key: 'sessions' },
  volume:   { label: 'Volume',  fmt: v => `${num(v)} kg`, key: 'volume' },
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
            Add three friends to unlock the <strong>Pack Leader</strong> medal.</p>
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

async function addFriendFlow() {
  const res = await modal({
    title: 'Add a friend',
    submit: 'Add',
    body: `
      <div class="field">
        <label for="fName">Name</label>
        <input class="input" id="fName" name="name" required placeholder="Sam Okafor">
      </div>
      <div class="field">
        <label for="fHandle">Handle</label>
        <input class="input" id="fHandle" name="handle" placeholder="sam_lifts">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="fStreak">Streak (days)</label>
          <input class="input" id="fStreak" name="streak" type="number" min="0" value="0">
        </div>
        <div class="field">
          <label for="fSessions">Sessions</label>
          <input class="input" id="fSessions" name="sessions" type="number" min="0" value="0">
        </div>
      </div>
      <p class="dim" style="font-size:.78rem">Local mode has no friend search, so their numbers are entered by hand.
        With the API connected this becomes a real invite.</p>`,
  });
  if (!res?.name?.trim()) return;
  await store.addFriend({
    name: res.name.trim(),
    handle: (res.handle || res.name).trim().toLowerCase().replace(/\s+/g, '_'),
    streak: +res.streak || 0,
    sessions: +res.sessions || 0,
    volume: 0,
    medals: 0,
  });
  toast('Friend added', 'ok');
}
