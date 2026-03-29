/**
 * POST /api/transform-openai
 *
 * On-demand OpenAI image transformation.
 * Called from the editor when the user switches to "OpenAI Stylized" background.
 *
 * Body: { satelliteDataUrl: string }
 * Returns: { dataUrl: string, provider: string } or { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformSatelliteImage } from '@/services/transformImage';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { success } = rateLimit(ip, { limit: 15, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  try {
    const { satelliteDataUrl } = await req.json();

    if (!satelliteDataUrl || typeof satelliteDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'Falta satelliteDataUrl.' },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[transform-openai] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Service temporarily unavailable.' },
        { status: 503 },
      );
    }

    const cropFactor = parseFloat(process.env.OPENAI_CROP_FACTOR ?? '0.55');

    console.log('[transform-openai] Starting OpenAI transformation, crop:', cropFactor);
    const t0 = Date.now();

    const result = await transformSatelliteImage(satelliteDataUrl, {
      provider: 'openai',
      cropFactor,
    });

    console.log(
      `[transform-openai] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );

    return NextResponse.json({
      dataUrl: result.dataUrl,
      provider: result.provider,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al transformar con OpenAI.';
    console.error('[transform-openai] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
