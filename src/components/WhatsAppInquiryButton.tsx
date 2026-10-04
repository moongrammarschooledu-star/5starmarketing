"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";
import { whatsappLink, whatsappUrlFor } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";

const STORAGE_KEY = "5starm_inquiry_contact";
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function readSaved(): { name: string; phone: string } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return { name: typeof v.name === "string" ? v.name : "", phone: typeof v.phone === "string" ? v.phone : "" };
    }
  } catch {
    /* storage unavailable - start empty */
  }
  return { name: "", phone: "" };
}

/** A WhatsApp inquiry button that first asks for the visitor's name and
 *  number (WhatsApp's own link never reveals who is writing), saves them as
 *  a lead, then opens WhatsApp with that info already in the message. */
export function WhatsAppInquiryButton({
  propertyId,
  propertyTitle,
  message,
  whatsappNumber,
  context,
  className,
  children,
}: {
  propertyId: string;
  propertyTitle: string;
  message: string;
  whatsappNumber?: string;
  context: string;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const saved = readSaved();
    setName((n) => n || saved.name);
    setPhone((p) => p || saved.phone);
    setError(null);
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) return setError("Please enter your name.");
    if (!PHONE_PATTERN.test(cleanPhone)) return setError("Please enter a valid phone number.");

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: cleanName, phone: cleanPhone }));
    } catch {
      /* not essential */
    }

    const full = `${message}\n\nMy name: ${cleanName}\nMy number: ${cleanPhone}`;
    const url = whatsappNumber ? whatsappUrlFor(whatsappNumber, full) : whatsappLink(full);
    // Opened straight from the click so the browser's pop-up blocker allows it.
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);

    void trackWhatsAppLeadAction({ name: cleanName, phone: cleanPhone, propertyTitle, propertyId });
    trackEvent("whatsapp_click", { context, property_id: propertyId });
    void recordWebsiteEventAction("whatsapp_click", { propertyId, sessionId: getOrCreateSessionId() });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label="Your contact details"
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Chat with us on WhatsApp</h2>
                <p className="mt-1 text-xs text-muted">So our team can reach you back, please share your name and number.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 block text-xs font-bold text-ink">
              Your name
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={120}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="mt-3 block text-xs font-bold text-ink">
              Your phone / WhatsApp number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="03XX XXXXXXX"
                maxLength={20}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-primary"
              />
            </label>

            {error && <p className="mt-3 text-xs font-semibold text-primary">{error}</p>}

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> Continue to WhatsApp
            </button>
          </form>
        </div>
      )}
    </>
  );
}
