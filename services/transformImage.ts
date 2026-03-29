/**
 * services/transformImage.ts
 *
 * Pluggable satellite-image transform abstraction.
 *
 * Providers:
 *   'sharp'  — server-side Sharp/libvips (always available, instant)
 *   'openai' — gpt-4o Responses API with image_generation (requires OPENAI_API_KEY)
 */

import sharp from 'sharp';

export type TransformProvider = 'auto' | 'sharp' | 'openai';
export type TransformStyle = 'security' | 'blueprint' | 'minimal';

export interface TransformOptions {
  provider?: TransformProvider;
  style?: TransformStyle;
  cropFactor?: number;
}

export interface TransformResult {
  dataUrl: string;
  width: number;
  height: number;
  provider: string;
}

export async function transformSatelliteImage(
  inputDataUrl: string,
  options: TransformOptions = {},
): Promise<TransformResult> {
  const { provider = 'auto', style = 'security' } = options;

  if (provider === 'openai') {
    return transformWithOpenAI(inputDataUrl, options.cropFactor);
  }

  return transformWithSharp(inputDataUrl, style, options.cropFactor);
}

// ─── OpenAI provider: gpt-4o + Responses API + image_generation ──────────────

const OPENAI_PROMPT = `Transform this satellite image into a modern, detailed top-down exterior property diagram focused on the central target property.

Critical requirements:
- focus on the main central property only
- preserve the real exterior layout faithfully
- preserve the real house footprint, roof shape, and orientation
- preserve the driveway location, shape, and path
- preserve the lot boundaries and property edges
- PRESERVE vegetation: trees, bushes, hedges, and lawn areas should be visible as detailed white line drawings
- preserve pools, patios, fences, sidewalks, and any outdoor features
- show landscape elements: garden beds, tree canopy outlines, grass area boundaries
- ignore or simplify neighboring houses (keep them very faint or omit)

Visual style:
- PURE BLACK background — the background MUST be solid #000000 pitch black with zero noise or texture
- clean white lines with varying thickness: thicker for building outlines, thinner for vegetation and landscape details
- modern, premium, high-end security planning aesthetic
- the look should feel like a professional landscape architect's site plan
- trees drawn as organic circular canopy outlines from above
- lawn/grass areas shown with subtle boundary lines
- driveway and walkways clearly distinguished from grass
- the overall feel should be clean, detailed, and elegant — not blocky or crude
- ALL empty space must be pure black — no gray, no noise, no gradient, no texture in the background

Do NOT:
- draw the whole neighborhood equally — the central property is the focus
- create an interior floor plan
- invent rooms, doors, or interior walls
- redesign the building or change the footprint
- use an old-fashioned CAD or blueprint look — this should feel modern
- make it look like a simple black and white sketch — add detail and refinement
- use any background color other than pure black #000000
- add any background texture, grain, or noise`;

async function transformWithOpenAI(
  inputDataUrl: string,
  cropFactor?: number,
): Promise<TransformResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada.');
  }

  // Lazy import to avoid loading openai when not needed
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });

  // Crop the satellite image tighter around the centre before sending to OpenAI
  const croppedDataUrl = await cropCentre(inputDataUrl, cropFactor ?? 0.55);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = await openai.responses.create({
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: croppedDataUrl, detail: 'high' },
          { type: 'input_text', text: OPENAI_PROMPT },
        ],
      },
    ],
    tools: [{ type: 'image_generation', quality: 'high' }],
  } as any);

  const imgCall = response.output?.find(
    (o: { type: string }) => o.type === 'image_generation_call',
  );
  const b64 = imgCall?.result as string | undefined;

  if (!b64) {
    throw new Error('OpenAI no generó una imagen. Intenta de nuevo.');
  }

  // Crush near-black pixels to pure #000000 using a fast Sharp linear op.
  // linear(1.2, -25): pixel at 20 → 0 (black), pixel at 200 → 215 (stays bright)
  const crushed = await sharp(Buffer.from(b64, 'base64'))
    .linear(1.2, -25)
    .png()
    .toBuffer();

  const dataUrl = `data:image/png;base64,${crushed.toString('base64')}`;
  return { dataUrl, width: 640, height: 640, provider: 'openai' };
}

/** Centre-crop a data URL image by the given factor and return a new JPEG data URL. */
async function cropCentre(dataUrl: string, factor: number): Promise<string> {
  if (factor >= 1) return dataUrl;

  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const buf = Buffer.from(base64, 'base64');
  const { width: w = 640, height: h = 640 } = await sharp(buf).metadata();

  const cW   = Math.round(w * factor);
  const cH   = Math.round(h * factor);
  const left = Math.round((w - cW) / 2);
  const top  = Math.round((h - cH) / 2);

  const cropped = await sharp(buf)
    .extract({ left, top, width: cW, height: cH })
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${cropped.toString('base64')}`;
}

// ─── Sharp pipeline (always available) ────────────────────────────────────────

async function transformWithSharp(
  inputDataUrl: string,
  style: TransformStyle,
  cropFactor?: number,
): Promise<TransformResult> {
  const base64 = inputDataUrl.includes(',')
    ? inputDataUrl.split(',')[1]
    : inputDataUrl;
  const inputBuffer = Buffer.from(base64, 'base64');

  const { width: origW = 640, height: origH = 640 } =
    await sharp(inputBuffer).metadata();

  let pipeline = sharp(inputBuffer);

  if (cropFactor && cropFactor < 1 && cropFactor > 0) {
    const cW   = Math.round(origW * cropFactor);
    const cH   = Math.round(origH * cropFactor);
    const left = Math.round((origW - cW) / 2);
    const top  = Math.round((origH - cH) / 2);
    pipeline = pipeline
      .extract({ left, top, width: cW, height: cH })
      .resize(origW, origH);
  }

  pipeline = pipeline.grayscale().normalize();

  if (style === 'security') {
    pipeline = pipeline
      .linear(0.52, -48)
      .tint({ r: 44, g: 68, b: 188 });
  } else if (style === 'blueprint') {
    pipeline = pipeline
      .linear(0.75, -15)
      .negate()
      .tint({ r: 28, g: 72, b: 210 });
  } else {
    pipeline = pipeline.linear(0.65, -30);
  }

  const graded = await pipeline.png().toBuffer();

  const overlay = buildOverlaySVG(origW, origH, style);
  const output = await sharp(graded)
    .composite([{ input: Buffer.from(overlay), blend: 'over' }])
    .png()
    .toBuffer();

  const dataUrl = `data:image/png;base64,${output.toString('base64')}`;
  return { dataUrl, width: origW, height: origH, provider: 'sharp' };
}

function buildOverlaySVG(w: number, h: number, style: TransformStyle): string {
  const gridColor =
    style === 'blueprint'
      ? 'rgba(80,160,255,0.10)'
      : 'rgba(26,107,255,0.07)';

  const vignetteColor =
    style === 'blueprint' ? '#000820' : '#000510';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none"
            stroke="${gridColor}" stroke-width="0.5"/>
    </pattern>
    <radialGradient id="v" cx="50%" cy="50%" r="72%" fx="50%" fy="50%">
      <stop offset="25%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="${vignetteColor}" stop-opacity="0.72"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#v)"/>
</svg>`;
}
