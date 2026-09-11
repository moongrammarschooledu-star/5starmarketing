/** Communication provider abstraction (section 23) — the automation
 *  engine never depends on a specific provider directly, and never
 *  claims a message was sent unless a real, configured provider actually
 *  exists. Mirrors src/lib/integrations/index.ts's isConfigured pattern
 *  (STEP 15, ad-platform integrations) exactly. Nothing here ever calls
 *  out to a real API — wiring an actual provider is future work, gated
 *  entirely on these env vars actually being set in production. */

export interface CommunicationProvider {
  id: "email" | "whatsapp" | "sms";
  name: string;
  isConfigured: boolean;
}

export function emailProvider(): CommunicationProvider {
  return {
    id: "email",
    name: "Email (SMTP)",
    isConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
  };
}

export function whatsappProvider(): CommunicationProvider {
  // Reuses the same env vars already documented (unset) in
  // .env.local.example for a future WhatsApp Business Cloud API
  // integration — today, WhatsApp "sending" is only ever a wa.me
  // click-to-chat link (see src/lib/site.ts).
  return {
    id: "whatsapp",
    name: "WhatsApp Business API",
    isConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  };
}

export function smsProvider(): CommunicationProvider {
  return {
    id: "sms",
    name: "SMS Gateway",
    isConfigured: Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER_ID),
  };
}

export function communicationProviders(): CommunicationProvider[] {
  return [emailProvider(), whatsappProvider(), smsProvider()];
}
