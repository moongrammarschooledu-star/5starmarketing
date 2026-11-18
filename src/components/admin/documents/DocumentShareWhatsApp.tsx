"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { createDocumentShareLinkAction } from "@/lib/actions/documents.actions";
import { openAdminWhatsApp } from "@/lib/adminWhatsApp";
import { whatsappUrlFor, site } from "@/lib/site";

/** Sends the document to a customer or owner on WhatsApp as a temporary link. */
export function DocumentShareWhatsApp({ documentId, title, documentNumber, defaultPhone, defaultName }: { documentId: string; title: string; documentNumber: string; defaultPhone?: string; defaultName?: string }) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (!/^[0-9+()\-\s]{7,20}$/.test(phone.trim())) return setError("Enter the WhatsApp number first.");
    setBusy(true);
    try {
      const link = await createDocumentShareLinkAction(documentId, days);
      const text =
        `Assalam-o-Alaikum${defaultName ? ` ${defaultName}` : ""},\n` +
        `${site.name} Estate & Builders ki taraf se aap ka document: ${link.title} (${link.documentNumber}).\n\n` +
        `Yahan se dekhein / download karein (link ${days} din tak chalega):\n${link.url}`;
      const wa = whatsappUrlFor(phone.trim(), text);
      setLastUrl(wa);
      openAdminWhatsApp(wa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-heading text-base font-bold text-ink">Send on WhatsApp</h2>
      <p className="mt-1 text-xs text-muted">
        {title} ({documentNumber}) is sent as a private link. Anyone who has the link can open the file until it expires, so send it only to the right person.
      </p>
      <label className="mt-3 block text-xs font-bold text-ink">
        WhatsApp number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="03XX XXXXXXX" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-primary" />
      </label>
      <label className="mt-3 block text-xs font-bold text-ink">
        Link stays open for
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-primary">
          <option value={1}>1 day</option>
          <option value={3}>3 days</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
        </select>
      </label>
      {error && <p className="mt-3 text-xs font-semibold text-primary">{error}</p>}
      <button type="button" onClick={send} disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} {busy ? "Making the link..." : "Send on WhatsApp"}
      </button>
      {lastUrl && (
        <a href={lastUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-xs font-semibold text-primary hover:underline">
          WhatsApp did not open? Tap here
        </a>
      )}
    </div>
  );
}
