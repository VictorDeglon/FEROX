/**
 * Estimating a meal from a photograph.
 *
 * ## What is actually possible here, plainly
 *
 * FEROX's one rule is that it works with **no backend, no build step and no
 * network**. Food recognition does not fit inside that rule. Identifying what
 * is on a plate and estimating its portion size needs a vision model; the
 * smallest useful ones are tens of megabytes, which is many times the size of
 * this entire app, and they would have to be downloaded before the first photo
 * could be taken. There is no way to do it offline in plain JavaScript, and any
 * page that claims otherwise is either shipping that download or sending your
 * photograph somewhere without saying so.
 *
 * So this module does two honest things instead of one dishonest one:
 *
 *   1. **Reads the photo locally.** Size, dimensions, and the time it was
 *      taken, all in the browser. The image never leaves the device. That is
 *      enough to attach the picture to a meal as a record — which is genuinely
 *      useful on its own, because a photo of what you ate is a better memory
 *      aid than a number you half-guessed.
 *
 *   2. **Offers an estimate *only* if a vision endpoint is configured**, the
 *      same way Google sign-in is offered only once a client id is set. It is
 *      off out of the box. When it is on, the athlete is told the photo is
 *      being sent, told where, and asked once — because uploading a picture of
 *      someone's kitchen to a third party is not a thing to do quietly.
 *
 * And the number that comes back is presented as an estimate, always editable,
 * never silently logged. Portion size from a single photograph is genuinely
 * hard — the same bowl of rice is 200 or 400 kcal depending on how deep it is,
 * and a photograph does not show depth.
 */
import { CONFIG } from './config.js';

/** True once a vision endpoint has been configured. Off by default. */
export const visionReady = () => Boolean(CONFIG.visionEndpoint);

/**
 * Read an image file in the browser. Nothing leaves the device.
 * @returns {Promise<{dataUrl, width, height, bytes, taken}>}
 */
export function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('That is not an image.'));
    if (file.size > 12e6) return reject(new Error('That photo is over 12 MB — try a smaller one.'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode that image.'));
      img.onload = () => resolve({
        dataUrl: reader.result,
        width: img.naturalWidth,
        height: img.naturalHeight,
        bytes: file.size,
        taken: file.lastModified ? new Date(file.lastModified).toISOString() : null,
      });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Shrink a photo before it is stored or sent.
 *
 * A modern phone photo is 3–8 MB, and localStorage gives you about five. One
 * un-resized picture would fill the entire log. 720px on the long edge is
 * plenty to recognise a meal by and lands around 80 KB.
 */
export async function shrinkPhoto(dataUrl, max = 720, quality = 0.72) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Could not decode that image.'));
    i.src = dataUrl;
  });

  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h };
}

/**
 * Ask a configured vision endpoint what is on the plate.
 *
 * @param {string} dataUrl  a shrunk JPEG
 * @returns {Promise<{items:{name,qty,kcal,p,c,f}[], note:string}>}
 * @throws if no endpoint is configured — the caller must check `visionReady()`
 *         and must have told the athlete the photo is leaving the device.
 *
 * The response shape is deliberately the same as a plate: a list of foods with
 * quantities, which drops straight into the builder for the athlete to correct.
 * An estimate you cannot edit is worse than no estimate.
 */
export async function estimateFromPhoto(dataUrl, { signal } = {}) {
  if (!visionReady()) {
    throw new Error('No vision endpoint is configured on this deployment.');
  }

  const res = await fetch(CONFIG.visionEndpoint, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) throw new Error(`The estimator returned ${res.status}.`);

  const body = await res.json();
  if (!Array.isArray(body?.items)) throw new Error('The estimator sent something unexpected.');

  // Whatever comes back is untrusted input from a service. Coerce it into the
  // shape the plate builder expects and drop anything that is not a number.
  return {
    items: body.items.slice(0, 20).map(it => ({
      name: String(it.name ?? 'Unknown').slice(0, 60),
      qty: Number.isFinite(+it.qty) ? Math.max(0.05, +it.qty) : 1,
      kcal: Math.max(0, Math.round(+it.kcal || 0)),
      p: Math.max(0, +(+it.p || 0).toFixed(1)),
      c: Math.max(0, +(+it.c || 0).toFixed(1)),
      f: Math.max(0, +(+it.f || 0).toFixed(1)),
    })),
    note: String(body.note ?? '').slice(0, 300),
  };
}

/**
 * The warning shown before a photo is sent anywhere. Written out here so it
 * cannot drift from the code that does the sending.
 */
export const PHOTO_NOTICE =
  'This sends the photograph to the estimator configured for this deployment. '
  + 'It leaves your device. Nothing else about your log is sent, and the result '
  + 'is an estimate you can edit before anything is logged.';
