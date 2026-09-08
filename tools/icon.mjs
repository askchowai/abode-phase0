/* Writes a small PNG by hand: an emerald rounded square with a white house. */
import zlib from 'zlib';
import fs from 'fs';

const S = 180;
const px = Buffer.alloc(S * S * 4);
const set = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
};
const inRounded = (x, y, r) => {
  const cx = Math.min(Math.max(x, r), S - r), cy = Math.min(Math.max(y, r), S - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (inRounded(x + 0.5, y + 0.5, 40)) set(x, y, 0x1c, 0x6b, 0x48);
  }
}
/* the house: a roof triangle over a body, in white */
const roofApexY = 46, roofBaseY = 96, roofHalf = 52, cx = S / 2;
for (let y = roofApexY; y <= roofBaseY; y++) {
  const t = (y - roofApexY) / (roofBaseY - roofApexY);
  const half = Math.round(roofHalf * t);
  for (let x = cx - half; x <= cx + half; x++) set(Math.round(x), y, 255, 255, 255);
}
for (let y = roofBaseY; y <= 140; y++) {
  for (let x = cx - 34; x <= cx + 34; x++) set(Math.round(x), y, 255, 255, 255);
}
/* a door punched back out in emerald */
for (let y = 112; y <= 140; y++) {
  for (let x = cx - 11; x <= cx + 11; x++) set(Math.round(x), y, 0x1c, 0x6b, 0x48);
}

const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, body, crcBuf]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
fs.writeFileSync('assets/icon-180.png', png);
console.log('assets/icon-180.png', png.length, 'bytes');
