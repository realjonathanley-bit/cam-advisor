/**
 * GET /api/autocomplete?input=...
 *
 * Server-side proxy for Google Places Autocomplete.
 * Keeps the API key private while giving the client live address suggestions.
 *
 * Requires the **Places API** to be enabled in your GCP project
 * (the same project that owns GOOGLE_MAPS_API_KEY).
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

interface Prediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { success } = rateLimit(ip, { limit: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ predictions: [] as Prediction[] });
  }

  const input = req.nextUrl.searchParams.get('input')?.trim();

  if (!input || input.length < 3 || input.length > 200) {
    return NextResponse.json({ predictions: [] as Prediction[] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('[autocomplete] GOOGLE_MAPS_API_KEY not configured');
    return NextResponse.json(
      { error: 'Service temporarily unavailable.' },
      { status: 503 },
    );
  }

  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  );
  url.searchParams.set('input', input);
  url.searchParams.set('types', 'address');
  url.searchParams.set('language', 'es');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[autocomplete]', data.status, data.error_message);
      return NextResponse.json({ predictions: [] as Prediction[] });
    }

    const predictions: Prediction[] = (data.predictions ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => ({
        description: p.description,
        placeId: p.place_id,
        mainText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? '',
      }),
    );

    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] as Prediction[] });
  }
}
