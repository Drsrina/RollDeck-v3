import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal PNG generator using Node built-in zlib
function createPngBuffer(width, height, getPixel) {
  const rowBytes = width * 4 + 1; // 1 filter byte (0) per row
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generateDicePixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background dark gradient (#07060d to #181530)
  const grad = Math.min(1, Math.max(0, 1 - dist * 0.7));
  let r = Math.round(7 + grad * 20);
  let g = Math.round(6 + grad * 15);
  let b = Math.round(13 + grad * 35);
  let a = 255;

  // D20 polygon approximation
  const maxR = isMaskable ? 0.55 : 0.72;
  if (dist < maxR) {
    const edgeDist = Math.abs(dist - maxR);
    if (edgeDist < 0.04) {
      // Neon cyan border
      return [34, 211, 238, 255];
    }
    // Inner facets
    const angle = Math.atan2(dy, dx);
    const facet = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 6);
    if (facet % 2 === 0) {
      r = 25; g = 22; b = 58;
    } else {
      r = 35; g = 28; b = 75;
    }

    // Inner center die glow
    if (dist < 0.28) {
      return [34, 211, 238, 255]; // central glow
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPngBuffer(192, 192, (x, y, w, h) => generateDicePixel(x, y, w, h, false)));
// 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPngBuffer(512, 512, (x, y, w, h) => generateDicePixel(x, y, w, h, false)));
// maskable 512x512 (with safe-zone margins)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPngBuffer(512, 512, (x, y, w, h) => generateDicePixel(x, y, w, h, true)));
// apple-touch-icon 180x180
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngBuffer(180, 180, (x, y, w, h) => generateDicePixel(x, y, w, h, false)));
// favicon.ico
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPngBuffer(32, 32, (x, y, w, h) => generateDicePixel(x, y, w, h, false)));

console.log('Successfully generated all PWA PNG icons!');
