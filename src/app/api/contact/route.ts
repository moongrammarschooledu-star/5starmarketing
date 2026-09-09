import { NextResponse } from "next/server";
import { leadService } from "@/services/leadService";
import type { LeadSource } from "@/lib/models/lead";

const ALLOWED_SOURCES: LeadSource[] = ["Website", "Property Page"];
const MAX_MESSAGE_LENGTH = 2000;

// Best-effort in-memory rate limiting (per serverless instance). It resets
// whenever the function cold-starts, so it isn't a hard guarantee on
// Vercel — for durable, multi-instance limiting, swap this map for a
// shared store (e.g. Upstash Redis) keyed the same way.
const submissionsByIp = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissionsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  submissionsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

// Validates contact-form / property-inquiry submissions and saves them as
// a real lead (Supabase `leads` table) visible in the admin CRM. It does
// not yet email/SMS the admin — wire that up to a provider (e.g. Resend,
// Nodemailer, or a webhook to the WhatsApp Business API) once one is
// chosen; the lead is still captured here either way.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again in a minute." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { name, phone, whatsapp, email, message, property, propertyId, consent, source, company } =
    body as Record<string, unknown>;

  // Honeypot: a hidden field real visitors never fill in. Bots that
  // auto-fill every field trip it — respond as if it worked so they don't
  // learn to avoid the trap, but never save the lead.
  if (typeof company === "string" && company.trim()) {
    return NextResponse.json({ ok: true });
  }

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof phone !== "string" ||
    !phone.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return NextResponse.json(
      { ok: false, error: "Name, phone and message are required." },
      { status: 400 }
    );
  }

  if (!/^[0-9+()\-\s]{7,20}$/.test(phone.trim())) {
    return NextResponse.json({ ok: false, error: "Invalid phone number." }, { status: 400 });
  }

  if (email && typeof email === "string" && email.trim() && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email address." }, { status: 400 });
  }

  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "Message is too long." },
      { status: 400 }
    );
  }

  const resolvedSource: LeadSource = ALLOWED_SOURCES.includes(source as LeadSource)
    ? (source as LeadSource)
    : "Website";

  try {
    await leadService.create({
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: typeof whatsapp === "string" && whatsapp.trim() ? whatsapp.trim() : undefined,
      email: typeof email === "string" && email.trim() ? email.trim() : undefined,
      propertyId: typeof propertyId === "string" && propertyId.trim() ? propertyId.trim() : undefined,
      propertyTitle: typeof property === "string" && property.trim() ? property.trim() : undefined,
      message: message.trim(),
      source: resolvedSource,
      consent: consent === true || consent === "on" || consent === "true",
    });
  } catch (error) {
    // The service already logs the real error server-side — never forward
    // raw database error details to the client.
    console.error("Contact form submission failed:", error);
    return NextResponse.json(
      { ok: false, error: "Could not submit your message. Please try WhatsApp instead." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
