import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sendEmailMessage } from "@/lib/communication/senders";
import { emailProvider } from "@/lib/marketing/providers";
import { resolveAlertRecipient } from "@/lib/leadAlert";
import { site } from "@/lib/site";

// Emails the office before a document (NOC, power of attorney, ID ...) runs out.
// Reminders go out at three points: 30 days before, 7 days before, and when it has
// expired. Each point is sent only once per expiry date - the columns
// expiry_reminded_for / expiry_reminder_stage remember what was already sent.

const DAY = 86400000;

function stageFor(daysLeft: number): number {
  if (daysLeft <= 0) return 3;
  if (daysLeft <= 7) return 2;
  if (daysLeft <= 30) return 1;
  return 0;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Due = { id: string; number: string; title: string; type: string; expiresAt: string; daysLeft: number; stage: number };

export const documentExpiryService = {
  async sendReminders(): Promise<{ checked: number; due: number; emailed: boolean; skipped?: string }> {
    const supabase = await createClient();
    const todayMs = Date.parse(new Date().toISOString().slice(0, 10));
    const horizon = new Date(todayMs + 30 * DAY).toISOString().slice(0, 10);
    const oldest = new Date(todayMs - 60 * DAY).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("documents")
      .select("id, document_number, title, expires_at, expiry_reminded_for, expiry_reminder_stage, document_types(label)")
      .not("expires_at", "is", null)
      .gte("expires_at", oldest)
      .lte("expires_at", horizon)
      .not("status", "in", "(ARCHIVED,SUPERSEDED,REJECTED,DRAFT)");
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const due: Due[] = [];
    for (const r of rows) {
      const daysLeft = Math.ceil((Date.parse(r.expires_at as string) - todayMs) / DAY);
      const target = stageFor(daysLeft);
      const already = r.expiry_reminded_for === r.expires_at ? Number(r.expiry_reminder_stage ?? 0) : 0;
      if (target > already) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typeLabel = (r as any).document_types?.label as string | undefined;
        due.push({ id: r.id, number: r.document_number, title: r.title, type: typeLabel ?? "", expiresAt: r.expires_at as string, daysLeft, stage: target });
      }
    }
    if (due.length === 0) return { checked: rows.length, due: 0, emailed: false };

    if (!emailProvider().isConfigured) return { checked: rows.length, due: due.length, emailed: false, skipped: "email is not set up" };
    const to = await resolveAlertRecipient();
    if (!to) return { checked: rows.length, due: due.length, emailed: false, skipped: "no recipient email" };

    due.sort((a, b) => a.daysLeft - b.daysLeft);
    const when = (d: Due) => (d.daysLeft < 0 ? `expired ${-d.daysLeft} din pehle` : d.daysLeft === 0 ? "aaj expire ho raha hai" : `${d.daysLeft} din baqi`);
    const linkFor = (d: Due) => `${site.url}/admin/documents/${d.id}`;
    const subject = `📄 ${due.length} document(s) ki mudat khatam hone wali hai`;
    const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:620px">
  <h2 style="color:#e01e26;margin:0 0 12px">Documents ki mudat ka yaad-dahani</h2>
  <table cellpadding="6" style="border-collapse:collapse;width:100%">
    ${due
      .map(
        (d) =>
          `<tr><td style="border-bottom:1px solid #eee"><a href="${esc(linkFor(d))}" style="font-weight:bold;color:#222">${esc(d.title)}</a><br><span style="color:#666;font-size:13px">${esc(d.number)}${d.type ? ` · ${esc(d.type)}` : ""}</span></td><td style="border-bottom:1px solid #eee;white-space:nowrap">${esc(d.expiresAt)}<br><b style="color:${d.daysLeft <= 7 ? "#e01e26" : "#b45309"}">${esc(when(d))}</b></td></tr>`
      )
      .join("")}
  </table>
  <p style="color:#666;font-size:13px">Naya document upload karne ke liye Admin → Documents kholein: <a href="${site.url}/admin/documents?expiring=1">${site.url}/admin/documents?expiring=1</a></p>
</div>`;
    const text = ["Documents ki mudat ka yaad-dahani", ...due.map((d) => `- ${d.title} (${d.number}): ${d.expiresAt} - ${when(d)} ${linkFor(d)}`)].join("\n");

    const result = await sendEmailMessage(to, subject, html, text);
    if (!result.success) {
      console.error("Document expiry email failed:", result.error);
      return { checked: rows.length, due: due.length, emailed: false, skipped: "email could not be sent" };
    }
    // Only now mark them as reminded, so a failed email is tried again tomorrow.
    for (const d of due) {
      await supabase.from("documents").update({ expiry_reminded_for: d.expiresAt, expiry_reminder_stage: d.stage }).eq("id", d.id);
    }
    return { checked: rows.length, due: due.length, emailed: true };
  },
};
