import { NextResponse } from "next/server";
import { leadService } from "@/services/leadService";
import { notificationService } from "@/services/notificationService";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import type { LeadSource, LeadType } from "@/lib/models/lead";
import { leadTypes } from "@/lib/models/lead";

const ALLOWED_SOURCES: LeadSource[] = ["Website", "Property Page"];
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

// Validates contact-form / property-inquiry submissions and saves them as
// a real lead (Supabase `leads` table) visible in the admin CRM. It does
// not yet email/SMS the admin — wire that up to a provider (e.g. Resend,
// Nodemailer, or a webhook to the WhatsApp Business API) once one is
// chosen; the lead is still captured here either way.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`contact:${ip}`, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again in a minute." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const {
    name,
    phone,
    whatsapp,
    email,
    message,
    property,
    propertyId,
    project,
    projectId,
    leadType,
    preferredTime,
    consent,
    source,
    company,
    firstTouchSource,
    firstTouchMedium,
    firstTouchCampaign,
    firstTouchContent,
    firstTouchTerm,
    firstTouchLandingPage,
    lastTouchSource,
    lastTouchMedium,
    lastTouchCampaign,
    lastTouchContent,
    lastTouchTerm,
    lastTouchLandingPage,
  } = body as Record<string, unknown>;

  // Attribution is optional, visitor-supplied context — never trusted
  // beyond "is this a plain string", and stored as-is (it only ever
  // drives internal marketing reporting, never anything security-sensitive).
  const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

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

  // If the visitor is a logged-in customer, tag the lead with their id
  // (STEP 10) so it shows up under "My Inquiries" — anonymous visitors
  // simply get no customer_id, exactly as before.
  let customerId: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    customerId = user?.id;
  } catch {
    customerId = undefined;
  }

  const trimmedProperty = typeof property === "string" && property.trim() ? property.trim() : undefined;
  const trimmedProject = typeof project === "string" && project.trim() ? project.trim() : undefined;
  const resolvedLeadType: LeadType | undefined = leadTypes.includes(leadType as LeadType) ? (leadType as LeadType) : undefined;
  // A "preferred callback time" isn't a field the leads table has (or
  // needs) — it's simply folded into the message text, same as any other
  // visitor-supplied context.
  const preferredTimeStr = typeof preferredTime === "string" && preferredTime.trim() ? preferredTime.trim() : undefined;
  const fullMessage = preferredTimeStr ? `${message.trim()}\n\nPreferred callback time: ${preferredTimeStr}` : message.trim();

  try {
    await leadService.create({
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: typeof whatsapp === "string" && whatsapp.trim() ? whatsapp.trim() : undefined,
      email: typeof email === "string" && email.trim() ? email.trim() : undefined,
      propertyId: typeof propertyId === "string" && propertyId.trim() ? propertyId.trim() : undefined,
      propertyTitle: trimmedProperty,
      projectId: typeof projectId === "string" && projectId.trim() ? projectId.trim() : undefined,
      projectTitle: trimmedProject,
      leadType: resolvedLeadType,
      customerId,
      message: fullMessage,
      source: resolvedSource,
      consent: consent === true || consent === "on" || consent === "true",
      firstTouchSource: str(firstTouchSource),
      firstTouchMedium: str(firstTouchMedium),
      firstTouchCampaign: str(firstTouchCampaign),
      firstTouchContent: str(firstTouchContent),
      firstTouchTerm: str(firstTouchTerm),
      firstTouchLandingPage: str(firstTouchLandingPage),
      lastTouchSource: str(lastTouchSource),
      lastTouchMedium: str(lastTouchMedium),
      lastTouchCampaign: str(lastTouchCampaign),
      lastTouchContent: str(lastTouchContent),
      lastTouchTerm: str(lastTouchTerm),
      lastTouchLandingPage: str(lastTouchLandingPage),
    });
    if (customerId) {
      await notificationService.notify(
        customerId,
        "inquiry_received",
        "Inquiry received",
        trimmedProperty ? `We've received your inquiry about ${trimmedProperty}.` : "We've received your inquiry.",
        "lead"
      );
    }
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
