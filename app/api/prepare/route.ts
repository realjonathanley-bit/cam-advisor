/**
 * POST /api/prepare
 *
 * Simplified pipeline for the manual planning editor:
 *   1. Geocode address → coordinates
 *   2. Fetch satellite image (server-side, keeps API key private)
 *   3. Transform image into a stylized security-plan background
 *   4. Return PreparedPropertyData for the client editor
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PrepareRequest, PrepareResponse, ApiError } from '@/types';
import { geocodeAddress } from '@/services/geocoding';
import { fetchSatelliteImage } from '@/services/satellite';
import { transformSatelliteImage } from '@/services/transformImage';
import { rateLimit } from '@/lib/rateLimit';

const DEBUG = process.env.DEBUG_LOGGING === 'true';

function log(...args: unknown[]) {
  if (DEBUG) console.log('[prepare]', ...args);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { success } = rateLimit(ip, { limit: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json<ApiError>({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  try {
    const body: PrepareRequest = await req.json();
    const address = body.address?.trim();

    if (!address || address.length > 300) {
      return NextResponse.json<ApiError>({ error: 'Invalid address.' }, { status: 400 });
    }
    if (!address || address.length < 5) {
      return NextResponse.json<ApiError>(
        { error: 'Dirección inválida o muy corta.' },
        { status: 400 },
      );
    }

    // ── Step 1: Geocode ────────────────────────────────────────────────────
    log('Geocoding:', address);
    const { coordinates, formattedAddress } = await geocodeAddress(address);
    log('Geocoded:', coordinates, formattedAddress);

    // ── Step 2: Satellite image ────────────────────────────────────────────
    log('Fetching satellite image');
    const satellite = await fetchSatelliteImage(coordinates);
    log('Satellite:', satellite.width, 'x', satellite.height, satellite.mimeType);

    // ── Step 3: Transform (crop + stylise) ─────────────────────────────────
    const cropFactor = parseFloat(process.env.SATELLITE_CROP_FACTOR ?? '0.78');
    log('Transforming — crop:', cropFactor);
    const transformed = await transformSatelliteImage(satellite.dataUrl, {
      provider: 'auto',
      style: 'security',
      cropFactor,
    });
    log('Transform done, provider:', transformed.provider);

    const autocompleteEnabled = !!process.env.GOOGLE_MAPS_API_KEY;
    const zoom = parseInt(process.env.SATELLITE_ZOOM ?? '20', 10);

    const result: PrepareResponse = {
      property: {
        address,
        formattedAddress,
        coordinates,
        originalImageDataUrl: satellite.dataUrl,
        transformedImageDataUrl: transformed.dataUrl,
        imageWidth: transformed.width,
        imageHeight: transformed.height,
        transformProvider: transformed.provider,
      },
      debug: {
        zoom,
        cropFactor,
        transformProvider: transformed.provider,
        autocompleteEnabled,
      },
    };

    return NextResponse.json<PrepareResponse>(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[prepare] Error:', message);

    const isUserError =
      message.includes('No se encontró') ||
      message.includes('inválida') ||
      message.includes('muy corta');

    return NextResponse.json<ApiError>(
      { error: message },
      { status: isUserError ? 422 : 500 },
    );
  }
}
