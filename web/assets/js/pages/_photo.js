/**
 * Logging a meal from a photograph.
 *
 * Read core/vision.js first — it explains why this cannot be an offline
 * feature and what the honest version looks like. The short form:
 *
 *   · the photo is read and shrunk **on the device**, always
 *   · it is attached to the meal as a record, which is useful on its own
 *   · it is sent somewhere for an estimate **only** if this deployment has
 *     configured an endpoint, and only after the athlete is told and agrees
 *   · whatever comes back opens in the plate builder to be corrected, never
 *     logged silently
 */
import { esc, toast, modal } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { readPhoto, shrinkPhoto, estimateFromPhoto, visionReady, PHOTO_NOTICE } from '../core/vision.js';

/** A camera is worth offering only where one can actually be opened. */
export const photoAvailable = () =>
  typeof FileReader !== 'undefined' && typeof document !== 'undefined';

/**
 * Take or choose a photo of a meal.
 * @returns {Promise<{photo, estimate}|null>}
 */
export function photoFlow({ onEstimate = null } = {}) {
  return new Promise(resolve => {
    const input = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: 'image/*',
    });
    // `capture` opens the camera directly on a phone and is ignored on desktop,
    // where it correctly falls back to a file chooser.
    input.setAttribute('capture', 'environment');

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const raw = await readPhoto(file);
        const small = await shrinkPhoto(raw.dataUrl);
        resolve(await review(small, raw, onEstimate));
      } catch (err) {
        toast(err.message, 'bad');
        resolve(null);
      }
    });

    input.click();
  });
}

/** Show the photo back, and offer whatever this deployment can actually do. */
function review(small, raw, onEstimate) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.style.width = 'min(520px, calc(100vw - 24px))';
    dlg.innerHTML = `
      <div class="card card-pad-lg stack" style="gap:14px">
        <div class="row-between">
          <h3>Your meal</h3>
          <button class="btn btn-ghost btn-icon" data-close aria-label="Close">${icon('x')}</button>
        </div>

        <img class="meal-photo" src="${small.dataUrl}" alt="The meal you photographed">

        <p class="dim" style="font-size:var(--step--2)">
          ${raw.width}×${raw.height}, stored at ${small.width}×${small.height}.
          This photo has not left your device.</p>

        ${visionReady()
          ? `<button class="btn btn-primary btn-block" data-estimate>
               ${icon('sparkle')}<span>Estimate what is in it</span></button>
             <p class="dim" style="font-size:var(--step--2)">${esc(PHOTO_NOTICE)}</p>`
          : `<div class="card" style="padding:13px;background:var(--surf-2)">
               <p class="muted" style="font-size:var(--step--1)">
                 <strong>FEROX cannot read a plate on its own.</strong> Recognising food needs a
                 vision model many times the size of this whole app, so it cannot run offline —
                 and offering it anyway would mean quietly uploading your photos.</p>
               <p class="dim" style="font-size:var(--step--2);margin-top:8px">
                 Keep the photo with the meal and add what was on the plate — it takes about
                 fifteen seconds and the numbers are yours rather than a guess. If you run your
                 own estimator, point <code>config.visionEndpoint</code> at it and this button
                 turns into an estimate.</p>
             </div>`}

        <button class="btn btn-block" data-build>${icon('plus')}<span>Add what was on the plate</span></button>
      </div>`;

    let done = false;
    const finish = v => { if (done) return; done = true; dlg.close(); dlg.remove(); resolve(v); };
    dlg.querySelector('[data-close]').addEventListener('click', () => finish(null));
    dlg.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
    dlg.querySelector('[data-build]').addEventListener('click', () => finish({ photo: small, estimate: null }));

    dlg.querySelector('[data-estimate]')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = `${icon('clock')}<span>Estimating…</span>`;
      try {
        const estimate = await estimateFromPhoto(small.dataUrl);
        finish({ photo: small, estimate });
        onEstimate?.(estimate);
      } catch (err) {
        toast(err.message, 'bad');
        btn.disabled = false;
        btn.innerHTML = `${icon('sparkle')}<span>Try again</span>`;
      }
    });

    document.body.append(dlg);
    dlg.showModal();
  });
}
