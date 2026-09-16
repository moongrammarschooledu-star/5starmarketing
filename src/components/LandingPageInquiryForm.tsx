"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { getAttributionPayload } from "@/lib/attribution";

type Status = "idle" | "submitting" | "success" | "error";

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

/** Same validation/honeypot/attribution pattern as PropertyInquiryForm,
 *  reusing the SAME /api/contact endpoint — a landing page lead is just
 *  a lead with a different source/property/project context, not a
 *  different pipeline. */
export function LandingPageInquiryForm({
  slug,
  ctaLabel,
  propertyId,
  propertyTitle,
  projectId,
  projectTitle,
}: {
  slug: string;
  ctaLabel: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectTitle?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setError(null);

    if (typeof data.company === "string" && data.company.trim()) {
      setStatus("success");
      form.reset();
      return;
    }

    const name = String(data.name ?? "").trim();
    const phone = String(data.phone ?? "").trim();
    if (!name || !phone) {
      setError("Please fill in your name and phone number.");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!data.consent) {
      setError("Please agree to be contacted.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          message: String(data.message ?? "").trim() || `Inquiry from the ${slug} landing page.`,
          property: propertyTitle,
          propertyId,
          project: projectTitle,
          projectId,
          leadType: "General Inquiry",
          source: "Website",
          firstTouchLandingPage: `/landing/${slug}`,
          ...getAttributionPayload(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Request failed");
      setStatus("success");
      trackEvent("landing_page_inquiry", { slug });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="font-heading text-lg font-bold text-ink">{ctaLabel}</h3>
      <div className="mt-5 grid grid-cols-1 gap-4">
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Name *</span>
          <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Phone *</span>
          <input type="tel" name="phone" required placeholder="03XX-XXXXXXX" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Message</span>
          <textarea name="message" rows={3} placeholder="Tell us what you're looking for…" className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex items-start gap-2.5 text-xs text-muted">
          <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary" />
          I agree to be contacted regarding this inquiry.
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : <><Send className="h-4 w-4" /> {ctaLabel}</>}
      </button>

      {error && <p className="mt-3 text-sm font-semibold text-primary">{error}</p>}
      {status === "success" && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> Thank you! We&apos;ll be in touch soon.
        </p>
      )}
    </form>
  );
}
