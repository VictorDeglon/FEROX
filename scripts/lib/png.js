/**
 * A very small PNG reader/writer — decode, resize, pad, encode.
 *
 * FEROX has no runtime dependencies and the build scripts keep that promise:
 * this is enough PNG to derive every square app icon from one piece of mascot
 * art, and nothing more. 8-bit truecolour with or without alpha, no interlace,
 * which is what every image generator and every `sips` conversion produces.
 */
import { inflateSync, deflateSync } from 'node:zlib';

/* ------------------------------------------------------------------ CRC-32 */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ------------------------------------------------------------------ decode */

/** Undo one scanline's filter, in place. `bpp` is bytes per pixel. */
function unfilter(type, line, prev, bpp) {
  for (let x = 0; x < line.length; x++) {
    const a = x >= bpp ? line[x - bpp] : 0;
    const b = prev[x];
    const c = x >= bpp ? prev[x - bpp] : 0;
    if (type === 1) line[x] = (line[x] + a) & 255;
    else if (type === 2) line[x] = (line[x] + b) & 255;
    else if (type === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
    else if (type === 4) {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
  }
}

/**
 * Decode a PNG to `{ width, height, data }` where `data` is RGBA bytes.
 * @throws if the file is not an 8-bit non-interlaced truecolour PNG.
 */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');

  let pos = 8, width = 0, height = 0, depth = 0, colour = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      depth = buf[pos + 16];
      colour = buf[pos + 17];
      interlace = buf[pos + 20];
    } else if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (depth !== 8) throw new Error(`only 8-bit PNGs are supported (got ${depth}-bit)`);
  if (interlace !== 0) throw new Error('interlaced PNGs are not supported');
  if (colour !== 2 && colour !== 6) throw new Error(`only truecolour PNGs are supported (colour type ${colour})`);

  const src = colour === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * src;
  const data = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride), i = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[i++];
    const line = Buffer.from(raw.subarray(i, i + stride));
    i += stride;
    unfilter(filter, line, prev, src);
    for (let x = 0; x < width; x++) {
      const s = x * src, d = (y * width + x) * 4;
      data[d] = line[s]; data[d + 1] = line[s + 1]; data[d + 2] = line[s + 2];
      data[d + 3] = src === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data };
}

/* ------------------------------------------------------------------ encode */

function chunk(type, body) {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/**
 * Encode RGBA to a PNG. Every scanline is filtered "up" (2), which costs
 * nothing to compute and compresses artwork with flat vertical runs — which is
 * exactly what a vector-style mascot is — far better than no filter at all.
 */
export function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = 2;
    for (let x = 0; x < stride; x++) {
      const cur = data[y * stride + x];
      const up = y ? data[(y - 1) * stride + x] : 0;
      raw[o + 1 + x] = (cur - up) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------------------------------------------- pixels  */

/** Bounding box of pixels with meaningful alpha, or null if the image is empty. */
export function alphaBounds({ width, height, data }, threshold = 8) {
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function crop(img, { minX, minY, width, height }) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    img.data.copy(data, y * width * 4, ((minY + y) * img.width + minX) * 4, ((minY + y) * img.width + minX + width) * 4);
  }
  return { width, height, data };
}

/**
 * Resize by averaging every source pixel that falls inside a destination one.
 * Box sampling rather than bilinear: these are all downscales, and averaging
 * the whole footprint is what stops a one-pixel red outline disappearing.
 * Alpha is premultiplied for the blend so a transparent edge cannot drag the
 * colour of neighbouring pixels toward black.
 */
export function resize(img, width, height) {
  const data = Buffer.alloc(width * height * 4);
  const sx = img.width / width, sy = img.height / height;

  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.ceil((y + 1) * sy));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.ceil((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1 && yy < img.height; yy++) {
        for (let xx = x0; xx < x1 && xx < img.width; xx++) {
          const s = (yy * img.width + xx) * 4;
          const al = img.data[s + 3] / 255;
          r += img.data[s] * al; g += img.data[s + 1] * al; b += img.data[s + 2] * al;
          a += img.data[s + 3];
          n++;
        }
      }
      const d = (y * width + x) * 4;
      const alpha = a / n;
      const un = alpha > 0 ? n * (alpha / 255) : 1;      // undo the premultiply
      data[d] = Math.round(r / un);
      data[d + 1] = Math.round(g / un);
      data[d + 2] = Math.round(b / un);
      data[d + 3] = Math.round(alpha);
    }
  }
  return { width, height, data };
}

/** `#rrggbb` (or `#rrggbbaa`) to an RGBA quad. `null` means transparent. */
export function rgba(hex) {
  if (!hex) return [0, 0, 0, 0];
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
    h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
  ];
}

/**
 * Fit `img` inside a `size`×`size` canvas at `scale` of the box, centred.
 *
 * This is the whole point of the module. Cropping a portrait mascot to a
 * square takes its ears off; fitting it keeps the silhouette and pays for it
 * with padding, which is invisible when the padding is the brand colour.
 */
export function square(img, size, { background = null, scale = 1, shiftY = 0 } = {}) {
  const [br, bg, bb, ba] = rgba(background);
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = br; data[i * 4 + 1] = bg; data[i * 4 + 2] = bb; data[i * 4 + 3] = ba;
  }

  const box = size * scale;
  const ratio = Math.min(box / img.width, box / img.height);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const small = resize(img, w, h);
  const ox = Math.round((size - w) / 2);
  const oy = Math.round((size - h) / 2 + size * shiftY);

  for (let y = 0; y < h; y++) {
    const ty = oy + y;
    if (ty < 0 || ty >= size) continue;
    for (let x = 0; x < w; x++) {
      const tx = ox + x;
      if (tx < 0 || tx >= size) continue;
      const s = (y * w + x) * 4, d = (ty * size + tx) * 4;
      const sa = small.data[s + 3] / 255;
      if (sa === 0) continue;
      const da = data[d + 3] / 255;
      const out = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) {
        data[d + k] = Math.round((small.data[s + k] * sa + data[d + k] * da * (1 - sa)) / out);
      }
      data[d + 3] = Math.round(out * 255);
    }
  }
  return { width: size, height: size, data };
}
