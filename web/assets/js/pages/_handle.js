/**
 * Claiming a handle.
 *
 * Shown once, the first time somebody signs in with Google, and reachable
 * afterwards from the profile. It is the only part of FEROX where a person
 * picks something that has to be unique across everybody, so it is also the
 * only part where "it's taken" is a real answer and has to be a good one.
 *
 * Two things make that bearable: suggestions are offered from the name Google
 * already gave us, so most people never type anything; and availability is
 * checked as they type, so nobody fills in a form and is told no at the end.
 *
 * The check is advisory. The claim itself is a transaction (see
 * core/social.js) because between a check and a submit someone else can take
 * it — rare, and the dialog has to handle it gracefully rather than pretend
 * it cannot happen.
 */
import { modal, esc, toast } from '../core/ui.js';
import { store } from '../core/store.js';
import { auth } from '../core/auth.js';
import {
  validateHandle, normaliseHandle, suggestHandles, handleAvailable, claimHandle,
  forgetPublished, HANDLE_MIN, HANDLE_MAX,
} from '../core/social.js';

/** Debounce, so a check does not fire on every keystroke. */
const DEBOUNCE_MS = 350;

/**
 * @param {{ first?: boolean }} opts `first` changes the copy for the sign-up
 *        case, where the person did not go looking for this dialog.
 * @returns {Promise<string|null>} the claimed handle, or null if they backed out
 */
export async function handleFlow({ first = false } = {}) {
  const uid = auth.uid;
  if (!uid) { toast('Sign in with Google to claim a handle', 'bad'); return null; }

  const p = store.data.profile;
  const current = p.handle ?? '';
  const picks = suggestHandles(p.email || auth.user?.email || '', p.name || auth.user?.name || '');
  const start = current || picks[0] || '';

  const result = await modal({
    title: first ? 'Pick your handle' : 'Change your handle',
    submit: first ? 'Claim it' : 'Save',
    body: `
      <p class="muted" style="font-size:var(--step--1)">
        ${first
          ? 'This is how friends find you, and it is yours alone. You can change it later.'
          : 'Your old handle is released when you take the new one, so somebody else can claim it.'}
      </p>

      <div class="field">
        <label for="hIn">Handle</label>
        <div class="row" style="gap:0;align-items:stretch">
          <span class="dim" style="display:flex;align-items:center;padding:0 10px;
            border:1px solid var(--line);border-right:0;border-radius:var(--r-md) 0 0 var(--r-md);
            background:var(--surf-2);font-size:var(--step--1)">@</span>
          <input class="input" id="hIn" name="handle" autocomplete="off" autocapitalize="off"
            spellcheck="false" style="border-radius:0 var(--r-md) var(--r-md) 0"
            minlength="${HANDLE_MIN}" maxlength="${HANDLE_MAX}" value="${esc(start)}" required>
        </div>
        <p id="hMsg" class="dim" style="font-size:.78rem;min-height:1.2em;margin-top:6px">
          ${HANDLE_MIN}–${HANDLE_MAX} characters. Letters, numbers and underscores.</p>
      </div>

      ${picks.length ? `<div class="stack" style="gap:7px">
        <span class="eyebrow">Suggestions</span>
        <div class="row wrap" style="gap:7px" id="hPicks">
          ${picks.map(h => `<button type="button" class="btn btn-sm" data-pick="${esc(h)}">@${esc(h)}</button>`).join('')}
        </div>
      </div>` : ''}`,

    onMount(dlg) {
      const input = dlg.querySelector('#hIn');
      const msg = dlg.querySelector('#hMsg');
      const submit = dlg.querySelector('button[type="submit"]');
      let timer = null;
      let token = 0;

      const say = (text, tone) => {
        msg.textContent = text;
        msg.style.color = tone === 'ok' ? 'var(--ok)' : tone === 'bad' ? 'var(--warn)' : '';
      };

      const check = async () => {
        const raw = input.value;
        const v = validateHandle(raw);
        if (!v.ok) { submit.disabled = true; say(v.why, 'bad'); return; }
        if (v.handle === current) { submit.disabled = false; say('This is your handle.', ''); return; }

        submit.disabled = true;
        say('Checking…', '');
        const mine = ++token;                    // ignore results that arrive late
        const res = await handleAvailable(v.handle).catch(() => null);
        if (mine !== token) return;

        if (res?.available) { submit.disabled = false; say(`@${v.handle} is free.`, 'ok'); }
        else { submit.disabled = true; say(res?.why ?? 'Could not check that one.', 'bad'); }
      };

      input.addEventListener('input', () => {
        // Fold as they type, so what they see is what gets claimed.
        const caretAtEnd = input.selectionStart === input.value.length;
        const folded = normaliseHandle(input.value);
        if (folded !== input.value) {
          input.value = folded;
          if (caretAtEnd) input.setSelectionRange(folded.length, folded.length);
        }
        clearTimeout(timer);
        timer = setTimeout(check, DEBOUNCE_MS);
      });

      dlg.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
        input.value = b.dataset.pick;
        clearTimeout(timer);
        check();
      }));

      check();
    },
  });

  if (!result) return null;

  try {
    const handle = await claimHandle(uid, result.handle, {
      nickname: (p.name ?? '').trim(),
      picture: p.picture ?? '',
      previous: current,
    });
    await store.updateProfile({ handle });
    forgetPublished(uid);        // republish immediately under the new name
    toast(`You are @${handle}`, 'ok');
    return handle;
  } catch (err) {
    // The transaction is the real gate, and this is the race it exists for.
    toast(err?.code === 'taken'
      ? 'Someone claimed that one a moment ago — try another.'
      : err?.message ?? 'Could not claim that handle', 'bad');
    return null;
  }
}

/** Prompt once, the first time a verified account has no handle. */
export async function ensureHandle() {
  if (!auth.uid) return null;
  if (store.data.profile.handle) return store.data.profile.handle;
  return handleFlow({ first: true });
}
