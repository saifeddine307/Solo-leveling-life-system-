import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // Simple uncompressed or deflate-compressed truecolor PNG generator
  // Scanlines: 1 filter byte (0) + 4 bytes per pixel (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = width / 2;
  const safeRadius = isMaskable ? maxRadius * 0.72 : maxRadius * 0.92;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default dark theme background: #0d0b14 -> [13, 11, 20]
      let r = 13, g = 11, b = 20, a = 255;

      // Outer radial glow
      const normDist = dist / maxRadius;
      if (normDist < 1.0) {
        const glowFactor = Math.pow(1 - normDist, 2);
        r = Math.min(255, Math.floor(13 + 80 * glowFactor));
        g = Math.min(255, Math.floor(11 + 30 * glowFactor));
        b = Math.min(255, Math.floor(20 + 140 * glowFactor));
      }

      // Diamond / Hexagon shape
      const hexDist = (Math.abs(dx) * 0.866 + Math.abs(dy) * 0.5);
      const isRing = Math.abs(hexDist - safeRadius * 0.65) < (width * 0.015);
      if (isRing) {
        r = 168; g = 85; b = 247; a = 255; // #a855f7
      }

      // Center dagger blade
      const absDx = Math.abs(dx);
      const inBlade = (dy >= -safeRadius * 0.7 && dy <= safeRadius * 0.6) &&
                      (absDx <= (safeRadius * 0.25) * (1 - (dy + safeRadius * 0.7) / (safeRadius * 1.3)));
      if (inBlade) {
        // Gradient purple/blue
        const t = (dy + safeRadius * 0.7) / (safeRadius * 1.3);
        r = Math.floor(192 * (1 - t) + 120 * t);
        g = Math.floor(132 * (1 - t) + 40 * t);
        b = Math.floor(252 * (1 - t) + 220 * t);
      }

      // Center gold eye
      const eyeDist = Math.sqrt(dx * dx + (dy - safeRadius * 0.05) * (dy - safeRadius * 0.05));
      if (eyeDist <= safeRadius * 0.08) {
        r = 234; g = 179; b = 8; // #eab308
      } else if (eyeDist <= safeRadius * 0.12 && eyeDist > safeRadius * 0.08) {
        r = 255; g = 255; b = 255;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk (zlib compressed)
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = calculateCRC(crcData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Table-based CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCRC(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate Icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(32, 32, false));

console.log('Successfully generated all PWA icons in /public');
