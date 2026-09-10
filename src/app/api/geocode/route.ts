import { NextResponse } from "next/server";

// Proxies geocoding to OpenStreetMap's Nominatim — the map provider this
// deployment uses needs no paid API key (see src/lib/map.ts for why).
// Server-side only: Nominatim's usage policy requires a real identifying
// User-Agent, which browsers refuse to let client-side fetch() set, and
// this also lets us rate-limit before ever reaching their service.
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "5starm-estate-builders/1.0 (maos.edu@gmail.com)";

const requestsByIp = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many location searches. Please wait a moment and try again." }, { status: 429 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 200);
  if (!q) {
    return NextResponse.json({ ok: false, error: "Please enter a location to search." }, { status: 400 });
  }

  try {
    // Biased toward Pakistan (countrycodes=pk) since that's where every
    // real listing is — still returns other matches if nothing local fits.
    const res = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(q)}&countrycodes=pk&limit=5&addressdetails=0`,
      { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
    const results = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return NextResponse.json({
      ok: true,
      results: results.map((r) => ({ label: r.display_name, latitude: Number(r.lat), longitude: Number(r.lon) })),
    });
  } catch (e) {
    console.error("geocode route failed:", e);
    return NextResponse.json({ ok: false, error: "Could not search for this location right now." }, { status: 502 });
  }
}
