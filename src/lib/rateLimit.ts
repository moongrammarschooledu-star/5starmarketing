import "server-only";

// Best-effort in-memory rate limiting (per serverless instance) — resets on
// cold start, so it isn't a hard multi-instance guarantee on Vercel; for a
// durable, shared-across-instances limit, swap this map for a store like
// Upstash Redis, keyed the same way. Used for public contact forms, the
// WhatsApp webhook, and outbound message sends (section 84).
const hits = new Map<string, number[]>();

/** Returns true if `key` has exceeded `max` hits within `windowMs`,
 *  recording this call as a hit either way. */
export function isRateLimited(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}
