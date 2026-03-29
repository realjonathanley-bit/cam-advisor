/**
 * In-memory rate limiter. Use Redis for multi-server production.
 */
const store = new Map<string, { count: number; start: number; window: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.start > entry.window) store.delete(key);
  }
}, 60_000);

export function rateLimit(
  ip: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { success: boolean; remaining: number } {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.start > windowMs) {
    store.set(key, { count: 1, start: now, window: windowMs });
    return { success: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { success: false, remaining: 0 };
  }
  return { success: true, remaining: limit - entry.count };
}
