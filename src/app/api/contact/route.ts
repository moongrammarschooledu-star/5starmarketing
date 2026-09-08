import { NextResponse } from "next/server";

// Validates and accepts contact-form submissions. It does not yet send an
// email or SMS — wire this up to a provider (e.g. Resend, Nodemailer, or a
// webhook to WhatsApp Business API) before relying on it for real leads.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { name, phone, email, message } = body as Record<string, unknown>;

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

  // TODO: forward this lead to email/CRM/WhatsApp once a provider is chosen.
  console.log("New 5STAR.M contact-form lead:", body);

  return NextResponse.json({ ok: true });
}
