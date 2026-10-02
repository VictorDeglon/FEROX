/**
 * A direct message thread.
 *
 * Opens over whatever page you were on. Everything sent is encrypted on this
 * device before it is written and decrypted on arrival — core/crypto.js has
 * the honest account of what that protects and what it does not, and the
 * dialog says the short version out loud rather than putting a padlock on it
 * and hoping nobody asks.
 */
import { modal, esc, toast } from '../core/ui.js';
import { auth } from '../core/auth.js';
import { sendMessage, watchMessages, profilesByUid } from '../core/social.js';
import { cryptoReady, MAX_MESSAGE } from '../core/crypto.js';
import { messageWarning } from '../core/moderation.js';

const when = d => (d
  ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  : '');

/**
 * @param {{uid:string, handle:string, nickname:string, pk?:string}} them
 */
export async function openChat(them) {
  if (!auth.uid) { toast('Sign in to send messages', 'bad'); return; }

  if (!cryptoReady()) {
    toast('This browser cannot encrypt messages — they are not sent unencrypted', 'bad');
    return;
  }

  // Their public key may not be on the profile we were handed.
  let pk = them.pk;
  if (!pk) {
    const [fresh] = await profilesByUid([them.uid]).catch(() => []);
    pk = fresh?.pk;
  }
  if (!pk) {
    toast(`${them.nickname || them.handle} has not opened messages yet — nothing to encrypt to`, 'bad');
    return;
  }

  let stop = null;

  await modal({
    title: `@${them.handle}`,
    submit: 'Close',
    cancel: 'Close',
    wide: true,
    body: `
      <div id="thread" class="chat-thread" role="log" aria-live="polite" aria-label="Messages">
        <p class="dim" style="font-size:.8rem">Loading…</p>
      </div>
      <form id="sendForm" class="row" style="gap:8px;align-items:flex-end" autocomplete="off">
        <textarea class="input" id="msg" rows="1" maxlength="${MAX_MESSAGE}"
          placeholder="Message @${esc(them.handle)}" style="resize:none;min-height:42px"></textarea>
        <button class="btn btn-primary" type="submit" id="sendBtn">Send</button>
      </form>
      <p class="dim" style="font-size:.72rem">
        Encrypted on your device. FEROX and Google store the scrambled text and cannot read it —
        but they can see that you two talk, and a message cannot be unsent.</p>`,

    onMount(dlg) {
      // Warn once per message; pressing send again goes through.
      const sentWarned = new Set();
      const thread = dlg.querySelector('#thread');
      const form = dlg.querySelector('#sendForm');
      const box = dlg.querySelector('#msg');
      const btn = dlg.querySelector('#sendBtn');

      const paint = rows => {
        if (!rows.length) {
          thread.innerHTML = `<p class="dim" style="font-size:.8rem">
            No messages yet. Say something.</p>`;
          return;
        }
        thread.innerHTML = rows.map(m => `
          <div class="chat-row${m.mine ? ' mine' : ''}">
            <div class="chat-bubble${m.mine ? ' mine' : ''}">
              ${m.text === null
                ? `<em class="dim">Sent to a key this device does not have.</em>`
                : esc(m.text)}
            </div>
            <span class="chat-time dim">${esc(when(m.at))}</span>
          </div>`).join('');
        thread.scrollTop = thread.scrollHeight;
      };

      watchMessages(auth.uid, them.uid, pk, paint)
        .then(fn => { stop = fn; })
        .catch(() => {
          thread.innerHTML = `<p class="dim" style="font-size:.8rem">
            Could not open this conversation.</p>`;
        });

      const send = async () => {
        const text = box.value.trim();
        if (!text) return;

        /*
         * A warning, not a block. The message is end-to-end encrypted, so
         * nothing but these two devices can read it and a block here would
         * be theatre on a feature whose whole design is that nobody in the
         * middle can see anything. Asking once is the honest version.
         */
        const warn = messageWarning(text);
        if (warn && !sentWarned.has(text)) {
          sentWarned.add(text);
          toast(warn, 'bad');
          return;
        }

        btn.disabled = true;
        // Clear optimistically: the listener paints the real message a moment
        // later, and leaving the text sitting there makes people send twice.
        box.value = '';
        try {
          await sendMessage(auth.uid, them.uid, pk, text);
        } catch (err) {
          box.value = text;                       // give it back, nothing lost
          toast('Could not send that', 'bad');
          console.info('[ferox] send failed:', err?.code ?? err);
        } finally {
          btn.disabled = false;
          box.focus();
        }
      };

      form.addEventListener('submit', e => { e.preventDefault(); send(); });
      // Enter sends, shift-enter makes a new line.
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
      box.focus();
    },
  });

  stop?.();        // stop paying for a listener on a closed dialog
}
