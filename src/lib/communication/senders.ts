import "server-only";
import { emailProvider, whatsappProvider, smsProvider } from "@/lib/marketing/providers";

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/** Real WhatsApp Business Cloud API send (section 14) — only ever
 *  called after `whatsappProvider().isConfigured` is checked by the
 *  caller. Uses free-form text messages; template-message sending
 *  (section 15/16, provider-approved templates + session-window rules)
 *  is architecture-ready (marketing_templates.provider_status/
 *  provider_template_id) but not implemented here since no template has
 *  ever been submitted to Meta for approval in this deployment. */
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<SendResult> {
  const provider = whatsappProvider();
  if (!provider.isConfigured) return { success: false, error: "WhatsApp Business API not configured." };

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const to = toPhone.replace(/[^0-9]/g, "");

  try {
    const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `WhatsApp API error (${res.status}).` };
    }
    const providerMessageId = data?.messages?.[0]?.id;
    return { success: true, providerMessageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "WhatsApp API request failed." };
  }
}

/** Real SMTP send (section 17) via nodemailer — a genuine, provider-
 *  agnostic SMTP client, only ever invoked after
 *  `emailProvider().isConfigured` is checked by the caller. */
export async function sendEmailMessage(to: string, subject: string, html: string, text?: string): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider.isConfigured) return { success: false, error: "Email provider not configured." };

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " "),
    });
    return { success: true, providerMessageId: info.messageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "SMTP send failed." };
  }
}

/** SMS (section 18) — genuinely architecture-only. SMS_API_KEY/
 *  SMS_SENDER_ID are deliberately generic (this deployment has never
 *  chosen a specific gateway — Twilio, a local Pakistani aggregator,
 *  etc.), so there is no single real REST endpoint this function could
 *  honestly call. It always reports this clearly rather than either
 *  faking a send or guessing a vendor's API shape. */
export async function sendSmsMessage(_toPhone: string, _body: string): Promise<SendResult> {
  const provider = smsProvider();
  if (!provider.isConfigured) return { success: false, error: "SMS provider not configured." };
  return { success: false, error: "SMS_API_KEY is set, but no specific SMS gateway has been wired up yet — this deployment has not chosen a vendor (e.g. Twilio) to integrate against." };
}
