import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Generates the extension icons (PNG, required by Chrome — SVG isn't allowed for
// toolbar/extension icons). Dependency-free: a tiny PNG encoder plus a vector
// renderer (rounded-square SDF + checkmark polyline) supersampled 4x for smooth
// edges. Re-run with `node tools/make-icons.js` after changing the design.

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'src', 'icons');
mkdirSync(OUT, { recursive: true });

const BRAND = [0x2a, 0x8a, 0x3e]; // matches the toolbar badge green
const WHITE = [0xff, 0xff, 0xff];
const SIZES = [16, 32, 48, 128];
const SS = 4; // supersampling factor per axis

// --- PNG encoding -----------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[p++] = rgba[i];
      raw[p++] = rgba[i + 1];
      raw[p++] = rgba[i + 2];
      raw[p++] = rgba[i + 3];
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- vector geometry (normalised 0..1 coordinates) --------------------------
// Canonical rounded-box signed distance; <=0 means inside.
function roundedBoxSDF(px, py, halfExtent, radius) {
  const dx = Math.abs(px - 0.5);
  const dy = Math.abs(py - 0.5);
  const qx = dx - halfExtent + radius;
  const qy = dy - halfExtent + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const CHECK = { p1: [0.28, 0.52], p2: [0.43, 0.67], p3: [0.73, 0.32], hw: 0.075 };

function renderIcon(size) {
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sumA = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          const inRect = roundedBoxSDF(px, py, 0.44, 0.16) <= 0;
          if (!inRect) continue;
          const dCheck = Math.min(
            segDist(px, py, ...CHECK.p1, ...CHECK.p2),
            segDist(px, py, ...CHECK.p2, ...CHECK.p3),
          );
          const col = dCheck <= CHECK.hw ? WHITE : BRAND;
          sumA += 255;
          sumR += col[0];
          sumG += col[1];
          sumB += col[2];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      const a = sumA / n;
      rgba[i + 3] = Math.round(a);
      // straight-alpha colour averaged over the covered subsamples only
      const covered = sumA / 255;
      if (covered > 0) {
        rgba[i] = Math.round(sumR / covered);
        rgba[i + 1] = Math.round(sumG / covered);
        rgba[i + 2] = Math.round(sumB / covered);
      }
    }
  }
  return rgba;
}

for (const size of SIZES) {
  const png = encodePNG(size, renderIcon(size));
  writeFileSync(resolve(OUT, `icon-${size}.png`), png);
  console.log(`wrote src/icons/icon-${size}.png (${png.length} bytes)`);
}
