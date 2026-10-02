/**
 * Client-side image handling for avatars.
 *
 * Profile pictures come straight off a phone camera — routinely 4–12 MB and
 * 4000px wide, for something that renders at 66px. Every one of those bytes
 * would sit in localStorage, which has a hard quota of a few megabytes, so a
 * single unresized photo can break the whole app's ability to save anything.
 *
 * So: centre-crop to a square, downscale to 256px, re-encode as WebP, and
 * refuse anything still too large afterwards.
 */

export const AVATAR_PX = 256;
export const MAX_BYTES = 120 * 1024;      // comfortably inside any quota
const ACCEPT = /^image\/(png|jpeg|webp|gif|avif|heic|heif)$/i;

/** Decode a File into something drawable, via createImageBitmap where possible. */
async function decode(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('That file could not be read as an image.'));
      img.src = url;
    });
    return img;
  } finally {
    // Revoking immediately is safe: the bitmap/Image has already decoded.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

const clamp01 = v => Math.min(1, Math.max(0, Number(v) || 0));
const dims = src => ({
  w: src.width ?? src.naturalWidth,
  h: src.height ?? src.naturalHeight,
});

/**
 * Turn a user-selected file into a small square data URL.
 * @returns {Promise<{dataUrl:string, bytes:number, from:{w:number,h:number}}>}
 */
export async function makeAvatar(file, size = AVATAR_PX, { focusY = null, quality = 0.85 } = {}) {
  if (!file) throw new Error('No file chosen.');
  if (file.type && !ACCEPT.test(file.type)) {
    throw new Error('That is not an image FEROX can read. Try a PNG or JPEG.');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('That image is over 25 MB. Pick a smaller one.');
  }

  const src = await decode(file);
  const { w, h } = dims(src);
  if (!w || !h) throw new Error('That image has no dimensions FEROX can use.');

  /*
   * Crop to a square, biased upward on a portrait.
   *
   * A blind centre crop is what was here, and it cuts heads off. People
   * photograph people vertically and put the face in the upper third, so on
   * a 3:4 portrait the centre square starts 12.5% down and takes the chin
   * and chest while losing the top of the head. Taking a quarter of the
   * slack instead of half keeps the face.
   *
   * `focusY` lets the caller override it — 0 is the top of the image, 1 the
   * bottom — because no heuristic is right for every photo and the person
   * looking at it can see what it should be.
   */
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const slack = h - side;
  const bias = focusY == null ? (h > w ? 0.25 : 0.5) : clamp01(focusY);
  const sy = slack * bias;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
  src.close?.();

  // WebP first; Safari versions that cannot encode it silently return a PNG,
  // which toDataURL signals by the prefix, so fall back to JPEG in that case.
  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  // Still heavy (busy photos compress poorly) — step the quality down once.
  let bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  if (bytes > MAX_BYTES) {
    const type = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    dataUrl = canvas.toDataURL(type, 0.7);
    bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  }
  if (bytes > MAX_BYTES * 2) {
    throw new Error('That image will not compress small enough. Try a simpler picture.');
  }

  return { dataUrl, bytes, from: { w, h } };
}

export const formatBytes = n =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;

/**
 * A thumbnail small enough to live in a public document.
 *
 * The full avatar is ~256px and 9–25 KB, which is right for the device that
 * owns it and far too big to publish — a public profile should be a few
 * hundred bytes and the rules cap the field at 500 characters, so uploaded
 * avatars simply never reached anybody else. Friends saw initials.
 *
 * 40 pixels at quality 0.6 comes out around 700–1,200 bytes of base64, which
 * is small enough to carry in the profile document and in the search index
 * without either becoming expensive. It is blurry at full size and perfect at
 * the 28–34px every avatar is actually rendered at.
 *
 * `focusY` is passed through so the thumbnail is cropped the same way the
 * large one was — otherwise somebody positions their face carefully and then
 * their friends see their chin.
 */
export const MICRO_PX = 40;
export const MICRO_MAX = 3000;          // characters of data URL

export async function makeMicroAvatar(file, { focusY = null } = {}) {
  const { dataUrl } = await makeAvatar(file, MICRO_PX, { focusY, quality: 0.6 });
  return dataUrl.length <= MICRO_MAX ? dataUrl : '';
}

/** The same, from an already-decoded large avatar rather than the file. */
export async function microFromDataUrl(dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) return '';
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = MICRO_PX;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, MICRO_PX, MICRO_PX);
    let out = canvas.toDataURL('image/webp', 0.6);
    if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', 0.6);
    return out.length <= MICRO_MAX ? out : '';
  } catch { return ''; }
}
