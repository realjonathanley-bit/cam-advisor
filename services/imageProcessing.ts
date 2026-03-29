/**
 * Phase 3 — Synthetic Diagram Generation
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STRATEGY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * We do NOT try to detect the exact house shape from pixel edges.
 * That approach is fragile (noise, roof color, vegetation, shadows).
 *
 * Instead, we use the satellite image for ONE thing only:
 *   → Detect which image edge has the street/pavement (= front of property)
 *
 * Then we GENERATE a clean synthetic house footprint:
 *   → Centered on the lot
 *   → Proportional to typical residential dimensions
 *   → Slightly offset toward the back (away from the street)
 *   → Small deterministic variation from the address so different addresses
 *     look slightly different but the SAME address always produces the same result
 *
 * Output: an SVG architectural diagram drawn on a black canvas.
 *   → Zero noise   → Zero texture   → Zero dependency on photo quality
 *   → Always clean → Always readable → Always premium
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW STREET DETECTION WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * We sample a 50px strip from each of the 4 image edges and compute:
 *
 *   pavement_score = mean_brightness / (std_deviation + 1)
 *
 * Flat pavement / street:  uniform gray  → HIGH mean, LOW stdev  → high score
 * Grass / vegetation:      irregular     → lower mean, HIGH stdev → low score
 * Building roof:           variable      → rarely at image edges
 *
 * The edge with the highest pavement score = street side = driveway side.
 * If no clear winner (confidence < 10%), defaults to bottom
 * (most Google Maps geocoding images put the street address at the bottom).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW HOUSE POSITION IS ESTIMATED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * - House is CENTERED horizontally and vertically on the lot
 * - Then offset slightly toward the BACK (away from the detected street)
 * - Offset = 6% of the image dimension
 * - This matches the typical residential layout where the house sits
 *   in the middle-to-back of the lot with the front yard facing the street
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW CONSISTENCY IS ENSURED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Same address → same diagram (address hash is deterministic)
 * 2. Different addresses → slightly different house proportions (±5% width, ±4% height)
 * 3. Driveway always connects house to the property boundary on the street side
 * 4. Door indicator always on the street-facing wall
 * 5. If detection fails → predictable fallback (bottom street, centered house)
 *
 * Server-side only. Never import in client components.
 */

import sharp from 'sharp';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ProcessedImageResult {
  dataUrl:  string;
  width:    number;
  height:   number;
  analysis: StructureAnalysis;
}

export interface StructureAnalysis {
  imageWidth:         number;
  imageHeight:        number;
  houseRect:          Rect;
  drivewaySide:       Side;
  /** How confident the street detection was (0–1) */
  detectionScore:     number;
  confident:          boolean;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type Side = 'bottom' | 'top' | 'left' | 'right';
interface Rect { x: number; y: number; w: number; h: number }

interface Orientation {
  drivewaySide: Side;
  confidence:   number;
  scores:       Record<Side, number>;
}

interface Geometry {
  W:            number;
  H:            number;
  propRect:     Rect;
  houseRect:    Rect;
  driveRect:    Rect;
  doorPoint:    { x: number; y: number };
  drivewaySide: Side;
}

// ─── Tuning ───────────────────────────────────────────────────────────────────

/** Width of edge strip sampled for street detection (pixels) */
const STRIP = 55;

const HOUSE = {
  /** Base house width as fraction of image width */
  wFrac:           0.44,
  /** Base house height as fraction of image height */
  hFrac:           0.34,
  /**
   * How far to push the house toward the back of the lot
   * as a fraction of the smaller image dimension.
   * 0.06 = 6% → ~38px on a 640px image
   */
  backOffset:      0.06,
  /** Driveway width as fraction of house width */
  driveWFrac:      0.36,
} as const;

const DRAW = {
  margin:          20,     // px gap from image edge to property boundary
  houseStroke:     2.5,
  boundaryStroke:  1.5,
  drivewayStroke:  1.5,
  gridSize:        26,     // px, for the background planning grid
} as const;

// ─── Main export ──────────────────────────────────────────────────────────────

export async function processPropertyImage(
  inputDataUrl: string,
  address?: string,
): Promise<ProcessedImageResult> {
  const base64 = inputDataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid image data URL.');
  const buf = Buffer.from(base64, 'base64');
  const { width = 640, height = 640 } = await sharp(buf).metadata();

  // A: Detect which edge is the street
  const orientation = await detectStreetSide(buf, width, height);

  // B: Compute the synthetic house geometry
  const geo = buildGeometry(orientation, width, height, address);

  // C: Render the clean SVG diagram onto a black canvas
  const png = await renderDiagram(geo);

  const analysis: StructureAnalysis = {
    imageWidth:     width,
    imageHeight:    height,
    houseRect:      geo.houseRect,
    drivewaySide:   geo.drivewaySide,
    detectionScore: orientation.confidence,
    confident:      orientation.confidence > 0.10,
  };

  return {
    dataUrl:  `data:image/png;base64,${png.toString('base64')}`,
    width,
    height,
    analysis,
  };
}

// ─── A: Street-side detection ─────────────────────────────────────────────────

async function detectStreetSide(
  buf: Buffer,
  width: number,
  height: number,
): Promise<Orientation> {
  const sw = STRIP;

  // Define the four edge strips
  const regions: Record<Side, sharp.Region> = {
    top:    { left: 0,          top: 0,           width,    height: sw },
    bottom: { left: 0,          top: height - sw, width,    height: sw },
    left:   { left: 0,          top: 0,           width: sw, height  },
    right:  { left: width - sw, top: 0,           width: sw, height  },
  };

  // Score each strip: uniform bright surface = pavement
  const scores: Record<Side, number> = { top: 0, bottom: 0, left: 0, right: 0 };

  for (const side of ['top', 'bottom', 'left', 'right'] as Side[]) {
    const { channels } = await sharp(buf)
      .grayscale()
      .extract(regions[side])
      .stats();
    const { mean, stdev } = channels[0];
    scores[side] = mean / (stdev + 1);
  }

  const sorted = (Object.entries(scores) as Array<[Side, number]>)
    .sort((a, b) => b[1] - a[1]);

  const [bestSide, best]  = sorted[0];
  const [,         second] = sorted[1];

  // Normalised confidence: how much better is the winner vs runner-up?
  const confidence = (best - second) / (best + 1);

  // Low confidence → street likely isn't clearly visible → default to bottom
  const drivewaySide: Side = confidence > 0.10 ? bestSide : 'bottom';

  return { drivewaySide, confidence, scores };
}

// ─── B: Synthetic geometry ────────────────────────────────────────────────────

function buildGeometry(
  orient: Orientation,
  W: number,
  H: number,
  address?: string,
): Geometry {
  const m    = DRAW.margin;
  const side = orient.drivewaySide;

  // Property boundary — inset from image edge
  const propRect: Rect = { x: m, y: m, w: W - m * 2, h: H - m * 2 };

  // Deterministic proportional variation from address (±5% w, ±4% h)
  const { dw, dh } = addressVariation(address ?? '');
  const houseW = Math.round(W * (HOUSE.wFrac + dw));
  const houseH = Math.round(H * (HOUSE.hFrac + dh));

  // Start at image center, then shift toward the back of the lot
  const cx = W / 2;
  const cy = H / 2;
  const off = Math.round(Math.min(W, H) * HOUSE.backOffset);

  const hcx = cx + (side === 'left' ? off : side === 'right' ? -off : 0);
  const hcy = cy + (side === 'top'  ? off : side === 'bottom'? -off : 0);

  const houseRect: Rect = {
    x: Math.round(hcx - houseW / 2),
    y: Math.round(hcy - houseH / 2),
    w: houseW,
    h: houseH,
  };

  // Driveway: rectangle from street-facing house wall to property boundary
  const dw2 = Math.round(houseW * HOUSE.driveWFrac);
  let driveRect: Rect;
  let doorPoint: { x: number; y: number };

  if (side === 'bottom') {
    const dy = houseRect.y + houseRect.h;
    driveRect = { x: Math.round(hcx - dw2 / 2), y: dy, w: dw2, h: Math.max(propRect.y + propRect.h - dy, 20) };
    doorPoint = { x: Math.round(hcx), y: dy };
  } else if (side === 'top') {
    const bot = houseRect.y;
    driveRect = { x: Math.round(hcx - dw2 / 2), y: propRect.y, w: dw2, h: Math.max(bot - propRect.y, 20) };
    doorPoint = { x: Math.round(hcx), y: bot };
  } else if (side === 'left') {
    const rt = houseRect.x;
    driveRect = { x: propRect.x, y: Math.round(hcy - dw2 / 2), w: Math.max(rt - propRect.x, 20), h: dw2 };
    doorPoint = { x: rt, y: Math.round(hcy) };
  } else {
    const lt = houseRect.x + houseRect.w;
    driveRect = { x: lt, y: Math.round(hcy - dw2 / 2), w: Math.max(propRect.x + propRect.w - lt, 20), h: dw2 };
    doorPoint = { x: lt, y: Math.round(hcy) };
  }

  // Clamp driveway to property boundary
  driveRect.x = clamp(driveRect.x, propRect.x, propRect.x + propRect.w);
  driveRect.y = clamp(driveRect.y, propRect.y, propRect.y + propRect.h);
  driveRect.w = clamp(driveRect.w, 0, propRect.x + propRect.w - driveRect.x);
  driveRect.h = clamp(driveRect.h, 0, propRect.y + propRect.h - driveRect.y);

  return { W, H, propRect, houseRect, driveRect, doorPoint, drivewaySide: side };
}

/**
 * Deterministic address hash → small proportional variation.
 * djb2 variant, 31-bit positive.
 */
function addressVariation(address: string): { dw: number; dh: number } {
  let h = 5381;
  for (let i = 0; i < address.length; i++) {
    h = ((h << 5) + h) ^ address.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  // Map bytes to [-0.05, +0.05] and [-0.04, +0.04]
  const dw = ((h & 0xFF)        / 255 - 0.5) * 0.10;
  const dh = (((h >> 8) & 0xFF) / 255 - 0.5) * 0.08;
  return { dw, dh };
}

// ─── C: SVG diagram rendering ─────────────────────────────────────────────────

async function renderDiagram(g: Geometry): Promise<Buffer> {
  return sharp({
    create: { width: g.W, height: g.H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
  })
    .composite([{ input: Buffer.from(buildSVG(g)), blend: 'over' }])
    .png()
    .toBuffer();
}

function buildSVG(g: Geometry): string {
  const { W, H, propRect: p, houseRect: h, driveRect: d, doorPoint, drivewaySide } = g;
  const n = (v: number) => Math.round(v);   // safe round helper
  const gs = DRAW.gridSize;

  // Corner tick marks at property boundary corners
  const tick = 9;
  const cornerTicks = [
    [p.x,       p.y      ],
    [p.x + p.w, p.y      ],
    [p.x,       p.y + p.h],
    [p.x + p.w, p.y + p.h],
  ].map(([cx, cy]) => `
    <line x1="${n(cx - tick)}" y1="${n(cy)}" x2="${n(cx + tick)}" y2="${n(cy)}" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
    <line x1="${n(cx)}" y1="${n(cy - tick)}" x2="${n(cx)}" y2="${n(cy + tick)}" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
  `).join('');

  // Door indicator: a thick dash on the street-facing wall
  const doorLen = Math.round(h.w * 0.18);
  const doorThick = 5;
  const doorSVG = (drivewaySide === 'bottom' || drivewaySide === 'top')
    ? `<rect x="${n(doorPoint.x - doorLen / 2)}" y="${n(doorPoint.y - doorThick / 2)}"
             width="${n(doorLen)}" height="${doorThick}"
             fill="rgba(255,255,255,0.65)" rx="1"/>`
    : `<rect x="${n(doorPoint.x - doorThick / 2)}" y="${n(doorPoint.y - doorLen / 2)}"
             width="${doorThick}" height="${n(doorLen)}"
             fill="rgba(255,255,255,0.65)" rx="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <!-- Subtle planning grid: looks like graph paper -->
    <pattern id="grid" width="${gs}" height="${gs}" patternUnits="userSpaceOnUse">
      <path d="M ${gs} 0 L 0 0 0 ${gs}" fill="none" stroke="rgba(255,255,255,0.030)" stroke-width="0.5"/>
    </pattern>
  </defs>

  <!-- 1. Background planning grid -->
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- 2. Property boundary (dashed) -->
  <rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${n(p.h)}"
        fill="none"
        stroke="rgba(255,255,255,0.20)"
        stroke-width="${DRAW.boundaryStroke}"
        stroke-dasharray="14,8"/>

  <!-- 3. Property corner marks -->
  ${cornerTicks}

  <!-- 4. Driveway / access corridor -->
  <rect x="${n(d.x)}" y="${n(d.y)}" width="${n(d.w)}" height="${n(d.h)}"
        fill="rgba(255,255,255,0.025)"
        stroke="rgba(255,255,255,0.38)"
        stroke-width="${DRAW.drivewayStroke}"
        stroke-dasharray="7,5"/>

  <!-- 5. House footprint (synthetic — centered and proportional) -->
  <rect x="${n(h.x)}" y="${n(h.y)}" width="${n(h.w)}" height="${n(h.h)}"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.88)"
        stroke-width="${DRAW.houseStroke}"
        rx="2"/>

  <!-- 6. Front door / entrance indicator -->
  ${doorSVG}

</svg>`;
}

// ─── analyzePropertyOnly (debug / route use) ──────────────────────────────────

export async function analyzePropertyOnly(
  inputDataUrl: string,
  address?: string,
): Promise<StructureAnalysis> {
  const base64 = inputDataUrl.split(',')[1];
  const buf    = Buffer.from(base64, 'base64');
  const { width = 640, height = 640 } = await sharp(buf).metadata();
  const orientation = await detectStreetSide(buf, width, height);
  const geo         = buildGeometry(orientation, width, height, address);
  return {
    imageWidth:     width,
    imageHeight:    height,
    houseRect:      geo.houseRect,
    drivewaySide:   geo.drivewaySide,
    detectionScore: orientation.confidence,
    confident:      orientation.confidence > 0.10,
  };
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

export async function buildFallbackImage(
  width = 640,
  height = 640,
): Promise<ProcessedImageResult> {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  }).png().toBuffer();
  return {
    dataUrl:  `data:image/png;base64,${buf.toString('base64')}`,
    width,
    height,
    analysis: {
      imageWidth: width, imageHeight: height,
      houseRect: { x: 0, y: 0, w: width, h: height },
      drivewaySide: 'bottom', detectionScore: 0, confident: false,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
