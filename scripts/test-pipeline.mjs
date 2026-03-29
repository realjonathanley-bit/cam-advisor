/**
 * Phase 3 — Synthetic Diagram test script
 *
 * Fetches a satellite image, detects street orientation,
 * generates a clean synthetic diagram, and saves outputs for visual inspection.
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=xxx node scripts/test-pipeline.mjs [lat] [lng] [address]
 *
 * Examples:
 *   GOOGLE_MAPS_API_KEY=xxx node scripts/test-pipeline.mjs 34.1478 -118.1445 "123 Main St Pasadena"
 *   GOOGLE_MAPS_API_KEY=xxx node scripts/test-pipeline.mjs 19.4326 -99.1332 "Insurgentes 1234 CDMX"
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT    = join(__dirname, '..', 'public', 'test-output');

const apiKey  = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) { console.error('GOOGLE_MAPS_API_KEY required.'); process.exit(1); }

const lat     = parseFloat(process.argv[2] ?? '34.1478');
const lng     = parseFloat(process.argv[3] ?? '-118.1445');
const address = process.argv[4] ?? 'test address';
const zoom    = 19;
const SIZE    = 640;
const STRIP   = 55;

// Must match services/imageProcessing.ts
const HOUSE = { wFrac: 0.44, hFrac: 0.34, backOffset: 0.06, driveWFrac: 0.36 };
const DRAW  = { margin: 20, houseStroke: 2.5, boundaryStroke: 1.5, drivewayStroke: 1.5, gridSize: 26 };

// ── djb2 hash (must match addressVariation in imageProcessing.ts) ─────────────
function addressVariation(addr) {
  let h = 5381;
  for (let i = 0; i < addr.length; i++) {
    h = ((h << 5) + h) ^ addr.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return { dw: ((h & 0xFF) / 255 - 0.5) * 0.10, dh: (((h >> 8) & 0xFF) / 255 - 0.5) * 0.08 };
}

async function run() {
  mkdirSync(OUTPUT, { recursive: true });
  console.log(`\n📍 ${lat}, ${lng}  |  "${address}"\n`);

  // ── 1. Fetch satellite ────────────────────────────────────────────────────
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${SIZE}x${SIZE}&maptype=satellite&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`Maps API: HTTP ${res.status}`); process.exit(1); }
  const satellite = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(OUTPUT, '1_satellite.jpg'), satellite);
  console.log('✓ 1_satellite.jpg');

  // ── 2. Detect street orientation ─────────────────────────────────────────
  const sides = ['top', 'bottom', 'left', 'right'];
  const regions = {
    top:    { left: 0,           top: 0,           width: SIZE,  height: STRIP },
    bottom: { left: 0,           top: SIZE - STRIP, width: SIZE,  height: STRIP },
    left:   { left: 0,           top: 0,           width: STRIP, height: SIZE  },
    right:  { left: SIZE - STRIP, top: 0,           width: STRIP, height: SIZE  },
  };

  const scores = {};
  for (const side of sides) {
    const { channels } = await sharp(satellite).grayscale().extract(regions[side]).stats();
    const { mean, stdev } = channels[0];
    scores[side] = mean / (stdev + 1);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestSide, best] = sorted[0];
  const [,         second] = sorted[1];
  const confidence = (best - second) / (best + 1);
  const drivewaySide = confidence > 0.10 ? bestSide : 'bottom';

  console.log('✓ Street detection scores:');
  sorted.forEach(([s, v]) => console.log(`     ${s.padEnd(7)} ${v.toFixed(2)}${s === drivewaySide ? '  ← selected' : ''}`));
  console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%  |  Street side: ${drivewaySide}`);

  // ── 3. Compute house geometry ─────────────────────────────────────────────
  const m    = DRAW.margin;
  const { dw, dh } = addressVariation(address);
  const houseW = Math.round(SIZE * (HOUSE.wFrac + dw));
  const houseH = Math.round(SIZE * (HOUSE.hFrac + dh));
  const off  = Math.round(SIZE * HOUSE.backOffset);
  const cx   = SIZE / 2 + (drivewaySide === 'left' ? off : drivewaySide === 'right' ? -off : 0);
  const cy   = SIZE / 2 + (drivewaySide === 'top'  ? off : drivewaySide === 'bottom'? -off : 0);
  const houseRect = { x: Math.round(cx - houseW/2), y: Math.round(cy - houseH/2), w: houseW, h: houseH };
  console.log(`✓ House rect: x=${houseRect.x} y=${houseRect.y} w=${houseRect.w} h=${houseRect.h}  (variation: dw=${(dw*100).toFixed(1)}% dh=${(dh*100).toFixed(1)}%)`);

  const propRect = { x: m, y: m, w: SIZE - m*2, h: SIZE - m*2 };
  const dw2 = Math.round(houseW * HOUSE.driveWFrac);
  let driveRect, doorPoint;
  if (drivewaySide === 'bottom') {
    const dy = houseRect.y + houseRect.h;
    driveRect = { x: Math.round(cx - dw2/2), y: dy, w: dw2, h: Math.max(propRect.y + propRect.h - dy, 20) };
    doorPoint = { x: Math.round(cx), y: dy };
  } else if (drivewaySide === 'top') {
    driveRect = { x: Math.round(cx - dw2/2), y: propRect.y, w: dw2, h: Math.max(houseRect.y - propRect.y, 20) };
    doorPoint = { x: Math.round(cx), y: houseRect.y };
  } else if (drivewaySide === 'left') {
    driveRect = { x: propRect.x, y: Math.round(cy - dw2/2), w: Math.max(houseRect.x - propRect.x, 20), h: dw2 };
    doorPoint = { x: houseRect.x, y: Math.round(cy) };
  } else {
    const lt = houseRect.x + houseRect.w;
    driveRect = { x: lt, y: Math.round(cy - dw2/2), w: Math.max(propRect.x + propRect.w - lt, 20), h: dw2 };
    doorPoint = { x: lt, y: Math.round(cy) };
  }

  // ── 4. Draw clean diagram ─────────────────────────────────────────────────
  const gs = DRAW.gridSize;
  const tick = 9;
  const doorLen   = Math.round(houseW * 0.18);
  const doorThick = 5;
  const isVert = drivewaySide === 'bottom' || drivewaySide === 'top';

  const doorSVG = isVert
    ? `<rect x="${Math.round(doorPoint.x - doorLen/2)}" y="${Math.round(doorPoint.y - doorThick/2)}" width="${doorLen}" height="${doorThick}" fill="rgba(255,255,255,0.65)" rx="1"/>`
    : `<rect x="${Math.round(doorPoint.x - doorThick/2)}" y="${Math.round(doorPoint.y - doorLen/2)}" width="${doorThick}" height="${doorLen}" fill="rgba(255,255,255,0.65)" rx="1"/>`;

  const cornerTicks = [[propRect.x, propRect.y],[propRect.x+propRect.w, propRect.y],[propRect.x, propRect.y+propRect.h],[propRect.x+propRect.w, propRect.y+propRect.h]]
    .map(([x,y]) => `
      <line x1="${x-tick}" y1="${y}" x2="${x+tick}" y2="${y}" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
      <line x1="${x}" y1="${y-tick}" x2="${x}" y2="${y+tick}" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>`).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <defs>
      <pattern id="grid" width="${gs}" height="${gs}" patternUnits="userSpaceOnUse">
        <path d="M ${gs} 0 L 0 0 0 ${gs}" fill="none" stroke="rgba(255,255,255,0.030)" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#grid)"/>
    <rect x="${propRect.x}" y="${propRect.y}" width="${propRect.w}" height="${propRect.h}" fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="1.5" stroke-dasharray="14,8"/>
    ${cornerTicks}
    <rect x="${driveRect.x}" y="${driveRect.y}" width="${driveRect.w}" height="${driveRect.h}" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.38)" stroke-width="1.5" stroke-dasharray="7,5"/>
    <rect x="${houseRect.x}" y="${houseRect.y}" width="${houseRect.w}" height="${houseRect.h}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.88)" stroke-width="2.5" rx="2"/>
    ${doorSVG}
  </svg>`;

  const diagram = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r:0,g:0,b:0,alpha:255 } } })
    .composite([{ input: Buffer.from(svg), blend: 'over' }]).png().toBuffer();
  writeFileSync(join(OUTPUT, '2_diagram.png'), diagram);
  console.log('✓ 2_diagram.png  — clean synthetic diagram');

  // ── 5. Detection overlay on satellite ────────────────────────────────────
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect x="${houseRect.x}" y="${houseRect.y}" width="${houseRect.w}" height="${houseRect.h}" fill="none" stroke="lime" stroke-width="2.5"/>
    <rect x="${driveRect.x}" y="${driveRect.y}" width="${driveRect.w}" height="${driveRect.h}" fill="none" stroke="yellow" stroke-width="1.5" stroke-dasharray="5,4"/>
    <text x="8" y="18" fill="lime" font-size="11" font-family="monospace">Street: ${drivewaySide} (${(confidence*100).toFixed(0)}%)</text>
  </svg>`;
  const overlay = await sharp(satellite).composite([{ input: Buffer.from(overlaySvg), blend: 'over' }]).png().toBuffer();
  writeFileSync(join(OUTPUT, '3_detection_overlay.png'), overlay);
  console.log('✓ 3_detection_overlay.png — house (green) + driveway (yellow) on satellite');

  // ── 6. Side-by-side comparison ────────────────────────────────────────────
  const satResized = await sharp(satellite).resize(SIZE, SIZE).toBuffer();
  const comp = await sharp({ create: { width: SIZE*2+4, height: SIZE, channels: 3, background: { r:8,g:8,b:10 } } })
    .composite([{ input: satResized, left: 0, top: 0 }, { input: diagram, left: SIZE+4, top: 0 }])
    .png().toBuffer();
  writeFileSync(join(OUTPUT, '4_comparison.png'), comp);
  console.log('✓ 4_comparison.png — satellite (left) vs clean diagram (right)');

  console.log(`\n✅ Done.`);
  console.log(`   View: http://localhost:3001/test-output/4_comparison.png\n`);
  console.log('Tuning knobs (in services/imageProcessing.ts):');
  console.log('  STRIP = 55          → wider strip = more context for street detection');
  console.log('  HOUSE.backOffset    → how far house sits from street (currently 6%)');
  console.log('  HOUSE.wFrac / hFrac → base house size (currently 44% × 34% of image)');
  console.log('  HOUSE.driveWFrac    → driveway width relative to house (currently 36%)');
  console.log('  DRAW.margin         → gap from image edge to property boundary');
}

run().catch(e => { console.error(e.message); process.exit(1); });
