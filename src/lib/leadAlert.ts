import "server-only";
import { after } from "next/server";
import { sendEmailMessage } from "@/lib/communication/senders";
import { emailProvider } from "@/lib/marketing/providers";
import { settingsService } from "@/services/settingsService";
import { site } from "@/lib/site";
import type { LeadInput } from "@/lib/models/lead";

/** Friendly names for the utm_campaign values used in our Meta ads, so the
 *  alert says which ad the lead came from. Unknown campaigns show as-is. */
const CAMPAIGN_LABELS: Record<string, string> = {
  md_rent_owners: "Rent ad — Ghar ka malik (owner)",
  md_rent_tenants: "Rent ad — Kirayedar (tenant)",
  md_airline_10marla: "Air Line 10 Marla ad — Khareedar",
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resolveRecipient(): Promise<string | undefined> {
  const fromEnv = process.env.LEAD_ALERT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  try {
    const email = (await settingsService.get()).email?.trim();
    return email || undefined;
  } catch {
    return undefined;
  }
}

async function send(lead: LeadInput): Promise<void> {
  if (!emailProvider().isConfigured) return;
  const to = await resolveRecipient();
  if (!to) return;

  const campaign = lead.lastTouchCampaign || lead.firstTouchCampaign;
  const adLabel = campaign ? CAMPAIGN_LABELS[campaign] ?? campaign : undefined;
  const fromAd = (lead.lastTouchSource || lead.firstTouchSource)?.toLowerCase().includes("facebook");
  const about = lead.propertyTitle || lead.projectTitle;

  const rows: [string, string | undefined][] = [
    ["Naam", lead.name],
    ["Phone", lead.phone],
    ["WhatsApp", lead.whatsapp && lead.whatsapp !== lead.phone ? lead.whatsapp : undefined],
    ["Email", lead.email],
    ["Property / Project", about],
    ["Inquiry type", lead.leadType],
    ["Kis ad se aayi", adLabel],
    ["Source", fromAd ? `${lead.source} (Facebook ad)` : lead.source],
    ["Rabta ka waqt", lead.preferredContactTime],
    ["Message", lead.message],
  ];
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1] && r[1].trim()));

  const digits = lead.phone.replace(/[^0-9]/g, "");
  const waNumber = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  const adminUrl = `${site.url}/admin/leads`;

  const subject = `🔔 Nayi website lead: ${lead.name}${adLabel ? ` — ${adLabel}` : about ? ` — ${about}` : ""}`;
  const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:560px">
  <h2 style="color:#e01e26;margin:0 0 12px">Nayi lead aayi hai — jaldi rabta karein</h2>
  <table cellpadding="6" style="border-collapse:collapse;width:100%">
    ${filled
      .map(
        ([k, v]) =>
          `<tr><td style="background:#f6f6f6;font-weight:bold;width:140px;vertical-align:top">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`
      )
      .join("")}
  </table>
  <p style="margin:18px 0 8px">
    <a href="https://wa.me/${esc(waNumber)}" style="background:#25d366;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">WhatsApp karein</a>
    &nbsp;
    <a href="tel:${esc(lead.phone)}" style="background:#2b2b2b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Call karein</a>
  </p>
  <p style="color:#666;font-size:13px">Status update karne ke liye Admin panel kholein: <a href="${adminUrl}">${adminUrl}</a></p>
</div>`;
  const text = [
    "Nayi lead aayi hai — jaldi rabta karein",
    ...filled.map(([k, v]) => `${k}: ${v}`),
    `WhatsApp: https://wa.me/${waNumber}`,
    `Admin panel: ${adminUrl}`,
  ].join("\n");

  const result = await sendEmailMessage(to, subject, html, text);
  if (!result.success) console.error("New lead email alert failed:", result.error);
}

/** Emails the business a "new lead" alert after a public website form
 *  saves a lead. Runs after the response is sent (so the visitor never
 *  waits on SMTP) and never throws — a failed alert must not affect the
 *  saved lead. Silently skipped when SMTP or a recipient isn't configured. */
export function queueNewLeadAlert(lead: LeadInput): void {
  const run = () =>
    send(lead).catch((e) => console.error("New lead email alert failed:", e));
  try {
    after(run);
  } catch {
    // Outside a request scope `after` is unavailable — send inline instead.
    void run();
  }
}
