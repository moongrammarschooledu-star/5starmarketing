import { NextResponse } from "next/server";
import { verifyMetaSignature, processWhatsAppWebhookPayload } from "@/services/communicationWebhookService";
import { isRateLimited } from "@/lib/rateLimit";

// =====================================================================
// Meta WhatsApp Business Cloud API webhook (STEP 22).
//
// GET  — Meta's one-time verification handshake. Requires
//        WHATSAPP_WEBHOOK_VERIFY_TOKEN to be set; otherwise refuses
//        with 501 rather than pretending to be configured.
//
// POST — Real inbound-message + delivery/read/failed status handling,
//        via communicationWebhookService.processWhatsAppWebhookPayload.
//        Every request's X-Hub-Signature-256 header is verified against
//        WHATSAPP_APP_SECRET before the payload is trusted at all — an
//        unsigned or invalid request is rejected with 401, never
//        processed. This is the ONLY place a message is ever marked
//        DELIVERED or READ in this codebase.
//
// Neither WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, nor any other
// secret is ever exposed in the response body, logs reachable by the
// client, or anywhere client-side.
// =====================================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json({ error: "WhatsApp webhook is not configured yet." }, { status: 501 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  if (!process.env.WHATSAPP_APP_SECRET) {
    return NextResponse.json({ error: "WhatsApp webhook is not configured yet (WHATSAPP_APP_SECRET missing)." }, { status: 501 });
  }

  // Section 84 — even a signed-looking flood of requests is capped per
  // source IP, before the (more expensive) signature verification runs.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`whatsapp-webhook:${ip}`, 60_000, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const result = await processWhatsAppWebhookPayload(payload);
    return NextResponse.json({ ok: true, processed: result.processed });
  } catch (e) {
    console.error("WhatsApp webhook processing failed:", e);
    // Meta will retry on non-2xx — return 200 to acknowledge receipt
    // without retrying, since the error is already logged server-side.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
