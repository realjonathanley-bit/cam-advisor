/**
 * Geocoding service — converts a human-readable address into coordinates.
 * Provider: Google Maps Geocoding API.
 *
 * Server-side only. Never import this in client components.
 */

import type { Coordinates } from '@/types';

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
}

/** Google Maps Geocoding API response shape (partial) */
interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
    };
  }>;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY no está configurada. Agrega la clave en .env.local.',
    );
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  let data: GoogleGeocodeResponse;

  try {
    const response = await fetch(url.toString(), {
      // next.js 16 fetch: disable caching for dynamic geocoding results
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al contactar Google Geocoding API.`);
    }

    data = await response.json();
  } catch (networkErr) {
    if (networkErr instanceof Error) throw networkErr;
    throw new Error('Error de red al geocodificar la dirección.');
  }

  // Handle API-level errors
  switch (data.status) {
    case 'OK':
      break;
    case 'ZERO_RESULTS':
      throw new Error(
        'No se encontró la dirección. Verifica que sea correcta y vuelve a intentarlo.',
      );
    case 'REQUEST_DENIED':
      throw new Error(
        `Google Geocoding API rechazó la solicitud: ${data.error_message ?? 'clave inválida o permisos insuficientes'}.`,
      );
    case 'INVALID_REQUEST':
      throw new Error('Solicitud de geocodificación inválida.');
    case 'OVER_QUERY_LIMIT':
      throw new Error('Límite de consultas de geocodificación excedido.');
    default:
      throw new Error(`Error de geocodificación: ${data.status}.`);
  }

  const result = data.results[0];

  return {
    coordinates: {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    },
    formattedAddress: result.formatted_address,
  };
}
