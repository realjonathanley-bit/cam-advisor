/**
 * POST /api/recommend
 *
 * Master recommendation endpoint. Orchestrates:
 *   1. Geocoding            ✅ Phase 2
 *   2. Satellite image      ✅ Phase 2
 *   3. Image processing         Phase 3
 *   4. Camera plan generation   Phase 4
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  RecommendationRequest,
  RecommendationResponse,
  ApiError,
} from '@/types';
import { geocodeAddress } from '@/services/geocoding';
import { fetchSatelliteImage } from '@/services/satellite';
import { processPropertyImage, buildFallbackImage } from '@/services/imageProcessing';

const DEBUG = process.env.DEBUG_LOGGING === 'true';

function log(...args: unknown[]) {
  if (DEBUG) console.log('[recommend]', ...args);
}

export async function POST(req: NextRequest) {
  try {
    const body: RecommendationRequest = await req.json();
    const address = body.address?.trim();

    if (!address || address.length < 5) {
      return NextResponse.json<ApiError>(
        { error: 'Dirección inválida o muy corta.' },
        { status: 400 },
      );
    }

    // ── Step 1: Geocode address → coordinates ─────────────────────────────
    log('Geocoding:', address);
    const { coordinates, formattedAddress } = await geocodeAddress(address);
    log('Geocoded:', coordinates, formattedAddress);

    // ── Step 2: Fetch satellite image ─────────────────────────────────────
    log('Fetching satellite image for', coordinates);
    const satellite = await fetchSatelliteImage(coordinates);
    log('Satellite image fetched:', satellite.width, 'x', satellite.height, satellite.mimeType);

    // ── Step 3: Detect orientation + generate clean synthetic diagram ─────────
    log('Generating property diagram...');
    let processed: Awaited<ReturnType<typeof processPropertyImage>>;
    try {
      processed = await processPropertyImage(satellite.dataUrl, address);
      log('Diagram ready:', {
        drivewaySide:      processed.analysis.drivewaySide,
        detectionScore:    processed.analysis.detectionScore.toFixed(2),
        confident:         processed.analysis.confident,
        houseRect:         processed.analysis.houseRect,
      });
    } catch (imgErr) {
      console.error('[recommend] Diagram generation failed, using fallback:', imgErr);
      processed = await buildFallbackImage(satellite.width, satellite.height);
    }

    // ── Step 4: Camera plan generation ───────────────────────────── Phase 4
    // Will use detectedHouseRect + drivewaySide to place cameras intelligently.

    const result: RecommendationResponse = {
      result: {
        property: {
          address,
          formattedAddress,
          coordinates,
          satelliteImageUrl: '',
          satelliteImageDataUrl: satellite.dataUrl,
          processedImageDataUrl: processed.dataUrl,
          imageWidth:            processed.width,
          imageHeight:           processed.height,
          detectedHouseRect:     processed.analysis.houseRect,
          drivewaySide:          processed.analysis.drivewaySide,
          detectionConfident:    processed.analysis.confident,
        },
        plans: {
          basic: {
            type: 'basic',
            label: 'Básica',
            description: '4 cámaras · Cobertura de perímetro esencial',
            cameraCount: 4,
            cameras: [],
          },
          medium: {
            type: 'medium',
            label: 'Media',
            description: '5 cámaras · Cobertura de perímetro mejorada',
            cameraCount: 5,
            cameras: [],
          },
          high: {
            type: 'high',
            label: 'Alta',
            description: '6 cámaras + timbre · Cobertura total del terreno',
            cameraCount: 7,
            cameras: [],
          },
        },
      },
    };

    return NextResponse.json<RecommendationResponse>(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[recommend] Error:', message);

    // Distinguish user-facing errors (4xx) from unexpected server errors (5xx)
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
