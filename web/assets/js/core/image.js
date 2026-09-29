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

const dims = src => ({
  w: src.width ?? src.naturalWidth,
  h: src.height ?? src.naturalHeight,
});

/**
 * Turn a user-selected file into a small square data URL.
 * @returns {Promise<{dataUrl:string, bytes:number, from:{w:number,h:number}}>}
 */
export async function makeAvatar(file, size = AVATAR_PX) {
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

  // Centre-crop to a square so faces are not squashed by a non-square photo.
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
  src.close?.();

  // WebP first; Safari versions that cannot encode it silently return a PNG,
  // which toDataURL signals by the prefix, so fall back to JPEG in that case.
  let dataUrl = canvas.toDataURL('image/webp', 0.85);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
