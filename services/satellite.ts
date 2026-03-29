/**
 * Satellite image service — fetches a satellite/aerial image for given coordinates.
 * Provider: Google Maps Static API.
 *
 * Server-side only. The API key is never exposed to the client;
 * images are fetched here and returned as base64 data URLs.
 */

import type { Coordinates } from '@/types';

export interface SatelliteImageResult {
  /** Base64 data URL — safe to send to the client */
  dataUrl: string;
  width: number;
  height: number;
  /** MIME type returned by Google (typically image/png or image/jpeg) */
  mimeType: string;
}

export interface SatelliteImageOptions {
  zoom?: number;
  width?: number;
  height?: number;
}

export async function fetchSatelliteImage(
  coords: Coordinates,
  options: SatelliteImageOptions = {},
): Promise<SatelliteImageResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY no está configurada. Agrega la clave en .env.local.',
    );
  }

  // Read dimensions from options → env vars → sensible defaults
  const zoom   = options.zoom   ?? parseInt(process.env.SATELLITE_ZOOM   ?? '20',  10);
  const width  = options.width  ?? parseInt(process.env.SATELLITE_WIDTH  ?? '640', 10);
  const height = options.height ?? parseInt(process.env.SATELLITE_HEIGHT ?? '640', 10);

  // Clamp to Google's free-tier maximum (640px per side without premium billing)
  const safeWidth  = Math.min(width,  640);
  const safeHeight = Math.min(height, 640);

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center',  `${coords.lat},${coords.lng}`);
  url.searchParams.set('zoom',    String(zoom));
  url.searchParams.set('size',    `${safeWidth}x${safeHeight}`);
  url.searchParams.set('maptype', 'satellite');
  url.searchParams.set('key',     apiKey);

  let response: Response;

  try {
    response = await fetch(url.toString(), { cache: 'no-store' });
  } catch (networkErr) {
    throw new Error('Error de red al obtener la imagen satelital.');
  }

  if (!response.ok) {
    // Google returns an HTML error page (not JSON) for bad requests
    throw new Error(
      `Google Static Maps API respondió con HTTP ${response.status}. Verifica que la API esté habilitada en tu proyecto GCP.`,
    );
  }

  const contentType = response.headers.get('content-type') ?? 'image/png';

  // Google returns JPEG for satellite view by default
  const mimeType = contentType.split(';')[0].trim();

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return { dataUrl, width: safeWidth, height: safeHeight, mimeType };
}
