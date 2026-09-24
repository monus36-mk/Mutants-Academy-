const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function createPNG(width, height, drawFn) {
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw Red & Black Gradient with Mutants Academy Emblem & Dumbbell
function drawAppIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / (w / 2); // -1 to 1
  const ny = (y - cy) / (h / 2); // -1 to 1
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background corner radius (if not maskable)
  if (!isMaskable) {
    const cornerR = 0.28;
    const absX = Math.abs(nx);
    const absY = Math.abs(ny);
    if (absX > 1 - cornerR && absY > 1 - cornerR) {
      const dx = absX - (1 - cornerR);
      const dy = absY - (1 - cornerR);
      if (dx * dx + dy * dy > cornerR * cornerR) {
        return [0, 0, 0, 0]; // Transparent outside squircle
      }
    }
  }

  // Base Dark-Red Gym Palette Gradient
  // Top-left: vibrant crimson #ef4444 (239, 68, 68) -> Bottom-right: deep dark red #991b1b (153, 27, 27)
  const gradT = (nx + ny + 2) / 4;
  let bgR = Math.round(180 + 59 * gradT);
  let bgG = Math.round(20 + 40 * gradT);
  let bgB = Math.round(20 + 40 * gradT);

  // Inner dark vignette
  if (dist > 0.75) {
    const vign = (dist - 0.75) / 0.25;
    bgR = Math.round(bgR * (1 - 0.25 * vign));
    bgG = Math.round(bgG * (1 - 0.25 * vign));
    bgB = Math.round(bgB * (1 - 0.25 * vign));
  }

  // Scale down graphics slightly for maskable safe-zone
  const scale = isMaskable ? 0.7 : 0.85;
  const gx = nx / scale;
  const gy = ny / scale;

  // Let's render the dumbbell emblem in pure white/silver with subtle lighting
  // Center bar: gy between -0.06 and 0.06, gx between -0.45 and 0.45
  let isWhite = false;
  let isAccent = false;

  // 1. Center horizontal bar
  if (Math.abs(gy) <= 0.07 && Math.abs(gx) <= 0.46) {
    isWhite = true;
  }

  // 2. Dumbbell outer plates (left and right)
  // Left inner plate: gx between -0.32 and -0.24, gy between -0.35 and 0.35
  // Left outer plate: gx between -0.46 and -0.36, gy between -0.26 and 0.26
  if (gx >= -0.34 && gx <= -0.22 && Math.abs(gy) <= 0.38) isWhite = true;
  if (gx >= -0.48 && gx <= -0.36 && Math.abs(gy) <= 0.28) isWhite = true;

  // Right inner plate: gx between 0.22 and 0.34, gy between -0.38 and 0.38
  // Right outer plate: gx between 0.36 and 0.48, gy between -0.28 and 0.28
  if (gx >= 0.22 && gx <= 0.34 && Math.abs(gy) <= 0.38) isWhite = true;
  if (gx >= 0.36 && gx <= 0.48 && Math.abs(gy) <= 0.28) isWhite = true;

  // 3. Center "M" Crest / Shield overlay in center
  // Center shield outline around (0, 0)
  const shieldW = 0.16;
  const shieldH = 0.22;
  if (Math.abs(gx) <= shieldW && gy >= -0.26 && gy <= shieldH) {
    isAccent = true;
  }

  if (isWhite) {
    // Shading on dumbbell
    const shade = 245 + Math.round(10 * (1 - Math.abs(gy * 2)));
    return [shade, shade, shade, 255];
  }

  if (isAccent) {
    // Red center badge highlight
    return [220, 38, 38, 255];
  }

  return [bgR, bgG, bgB, 255];
}

console.log('Generating PWA icons...');

// 192x192
const p192 = createPNG(192, 192, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), p192);

// 512x512
const p512 = createPNG(512, 512, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), p512);

// Maskable 512x512
const pMask = createPNG(512, 512, (x, y, w, h) => drawAppIcon(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512.png'), pMask);

// Apple Touch Icon 180x180
const pApple = createPNG(180, 180, (x, y, w, h) => drawAppIcon(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), pApple);

// Write SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  <g filter="url(#glow)" transform="translate(256, 256)">
    <!-- Dumbbell Bar -->
    <rect x="-130" y="-18" width="260" height="36" rx="10" fill="#ffffff"/>
    
    <!-- Left Weight Plates -->
    <rect x="-190" y="-75" width="34" height="150" rx="12" fill="#f8fafc"/>
    <rect x="-145" y="-95" width="38" height="190" rx="14" fill="#ffffff"/>
    
    <!-- Right Weight Plates -->
    <rect x="107" y="-95" width="38" height="190" rx="14" fill="#ffffff"/>
    <rect x="156" y="-75" width="34" height="150" rx="12" fill="#f8fafc"/>
    
    <!-- Central Shield Crest with M -->
    <path d="M-44 -55 L44 -55 L44 15 Q44 65 0 85 Q-44 65 -44 15 Z" fill="#dc2626" stroke="#ffffff" stroke-width="8"/>
    <path d="M-22 45 L-22 -20 L-4 15 L4 15 L22 -20 L22 45" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
console.log('PWA icons created successfully in public/icons/');
