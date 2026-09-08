import { NextResponse } from "next/server";
import { inquiryService } from "@/services/inquiryService";

// Validates contact-form submissions and saves them as a real lead
// (Supabase `inquiries` table) visible in the admin dashboard. It does not
// yet email/SMS the admin — wire that up to a provider (e.g. Resend,
// Nodemailer, or a webhook to the WhatsApp Business API) once one is
// chosen; the lead is still captured here either way.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { name, phone, email, message, property, propertyId } = body as Record<string, unknown>;

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

  try {
    await inquiryService.create({
      name: name.trim(),
      phone: phone.trim(),
      email: typeof email === "string" && email.trim() ? email.trim() : undefined,
      propertyId: typeof propertyId === "string" && propertyId.trim() ? propertyId.trim() : undefined,
      propertyTitle: typeof property === "string" && property.trim() ? property.trim() : undefined,
      message: message.trim(),
      source: "Contact Form",
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
