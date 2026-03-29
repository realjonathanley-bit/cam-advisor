import { NextResponse } from 'next/server';

export async function GET() {
  const ready = Boolean(process.env.GOOGLE_MAPS_API_KEY);
  return NextResponse.json({ status: ready ? 'ok' : 'misconfigured' });
}
