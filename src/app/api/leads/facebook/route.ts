import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { leadService } from "@/services/leadService";
import { queueNewLeadAlert } from "@/lib/leadAlert";
import type { LeadInput, LeadType } from "@/lib/models/lead";

/**
 * Receives leads from Facebook/Instagram Instant Forms (Meta lead ads),
 * forwarded by an automation (Make.com: "Facebook Lead Ads → HTTP").
 *
 * Auth: the caller must send the shared secret in the `x-webhook-secret`
 * header, matching FACEBOOK_LEADS_WEBHOOK_SECRET. Without that env var the
 * endpoint is disabled (503) so it can never accept anonymous posts.
 *
 * Body (JSON): name, phone (required); email, purpose, property_type, area,
 * budget, timeline, form_name, ad_name, campaign_name, leadgen_id (optional).
 * The lead is saved like a website inquiry (admin CRM) and the usual
 * new-lead email alert is sent.
 */

const MAX = 300;

function str(v: unknown, max = MAX): string | undefined {
  if (typeof v !== "string" && typeof v !== "number") return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
}

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function leadTypeFor(purpose: string | undefined): LeadType {
  const p = (purpose ?? "").toLowerCase();
  if (p.includes("bech")) return "Seller Inquiry";
  if (p.includes("rent")) return "Rental Inquiry";
  return "General Inquiry";
}

export async function POST(request: Request) {
  const expected = process.env.FACEBOOK_LEADS_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("x-webhook-secret"), expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const phone = str(body.phone, 40);
  if (!name || !phone) {
    return NextResponse.json({ ok: false, error: "name and phone are required." }, { status: 400 });
  }

  const purpose = str(body.purpose);
  const answers: [string, string | undefined][] = [
    ["Kya karna hai", purpose],
    ["Property", str(body.property_type)],
    ["Area", str(body.area)],
    ["Budget", str(body.budget)],
    ["Kab tak", str(body.timeline)],
  ];
  const lines = answers.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  const formName = str(body.form_name);
  const adName = str(body.ad_name);
  const leadgenId = str(body.leadgen_id, 60);
  const message = [
    "Facebook Instant Form lead",
    ...lines,
    formName ? `Form: ${formName}` : undefined,
    adName ? `Ad: ${adName}` : undefined,
    leadgenId ? `Meta lead ID: ${leadgenId}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const leadInput: LeadInput = {
    name,
    phone,
    whatsapp: phone,
    email: str(body.email, 160),
    leadType: leadTypeFor(purpose),
    message,
    source: "Facebook",
    preferredContactMethod: "WhatsApp",
    consent: true,
    firstTouchSource: "facebook",
    firstTouchMedium: "instant_form",
    firstTouchCampaign: str(body.campaign_name) ?? "facebook_instant_form",
    lastTouchSource: "facebook",
    lastTouchMedium: "instant_form",
    lastTouchCampaign: str(body.campaign_name) ?? "facebook_instant_form",
  };

  try {
    await leadService.create(leadInput);
    queueNewLeadAlert(leadInput);
  } catch (error) {
    console.error("Facebook lead webhook failed:", error);
    return NextResponse.json({ ok: false, error: "Could not save the lead." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
