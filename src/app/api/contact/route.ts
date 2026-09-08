import { NextResponse } from "next/server";
import { inquiriesRepository } from "@/lib/repositories/inquiries.repository";

// Validates contact-form submissions and saves them as a real lead in the
// admin dashboard (Inquiries). It does not yet email/SMS the admin —
// wire that up to a provider (e.g. Resend, Nodemailer, or a webhook to the
// WhatsApp Business API) once one is chosen; the lead is still captured
// here either way.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { name, phone, email, message, property } = body as Record<string, unknown>;

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

  if (email && typeof email === "string" && email.trim() && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email address." }, { status: 400 });
  }

  await inquiriesRepository.create({
    name: name.trim(),
    phone: phone.trim(),
    email: typeof email === "string" && email.trim() ? email.trim() : undefined,
    propertyTitle: typeof property === "string" && property.trim() ? property.trim() : undefined,
    message: message.trim(),
    source: "Contact Form",
  });

  return NextResponse.json({ ok: true });
}
