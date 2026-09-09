import { NextResponse } from "next/server";

// =====================================================================
// Placeholder for the future Meta WhatsApp Business Cloud API webhook.
//
// NOT ACTIVE. Nothing in the current admin dashboard or public site
// calls, expects, or depends on this route — all WhatsApp messaging
// today happens entirely client-side via normal wa.me click-to-chat
// links. This file only documents where the real implementation goes
// once Meta credentials exist.
//
// When Meta credentials (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
// WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_API_VERSION,
// WHATSAPP_WEBHOOK_VERIFY_TOKEN) are configured, this route would:
//
//   GET  — Meta's webhook verification handshake. Meta calls this once
//          when you register the webhook URL in the App Dashboard, with
//          query params hub.mode=subscribe, hub.verify_token=<yours>,
//          hub.challenge=<random string>. You must compare hub.verify_token
//          against WHATSAPP_WEBHOOK_VERIFY_TOKEN (server-side only) and,
//          if it matches, respond with the raw hub.challenge value as
//          plain text — otherwise respond 403.
//
//   POST — Inbound webhook events from Meta: incoming customer messages,
//          and message status updates (sent/delivered/read/failed) for
//          messages sent via the Cloud API. This is the ONLY legitimate
//          source of real delivery/read status — never fabricate it
//          elsewhere in the app. Each event must be validated (e.g. the
//          X-Hub-Signature-256 header, verified server-side using the
//          app secret) before trusting its payload.
//
// Never expose WHATSAPP_ACCESS_TOKEN or any other secret in the response
// body, logs reachable by the client, or anywhere client-side.
// =====================================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json(
      { error: "WhatsApp webhook is not configured yet. This endpoint is a placeholder for future Meta Cloud API integration." },
      { status: 501 }
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

export async function POST() {
  // Inbound message/status handling is not implemented — no Meta
  // credentials are configured, and nothing in this app currently sends
  // messages through the Cloud API, so there is nothing for Meta to
  // call back about yet.
  return NextResponse.json(
    { error: "WhatsApp webhook is not configured yet. This endpoint is a placeholder for future Meta Cloud API integration." },
    { status: 501 }
  );
}
