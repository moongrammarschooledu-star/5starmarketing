"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { getAttributionPayload } from "@/lib/attribution";

type Status = "idle" | "submitting" | "success" | "error";

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function PropertyInquiryForm({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setError(null);

    // Honeypot: real visitors never fill this hidden field.
    if (typeof data.company === "string" && data.company.trim()) {
      setStatus("success");
      form.reset();
      return;
    }

    const name = String(data.name ?? "").trim();
    const phone = String(data.phone ?? "").trim();
    const email = String(data.email ?? "").trim();
    const message = String(data.message ?? "").trim();

    if (!name || !phone || !message) {
      setError("Please fill in your name, phone and message.");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!data.consent) {
      setError("Please agree to be contacted regarding this property.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          property: propertyTitle,
          propertyId,
          source: "Property Page",
          ...getAttributionPayload(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Request failed");
      setStatus("success");
      trackEvent("property_inquiry", { property_id: propertyId });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <h3 className="font-heading text-lg font-bold text-ink">Request Property Details</h3>
      <p className="mt-1 text-sm text-muted">
        Interested in {propertyTitle}? Send us your details and we&apos;ll get back to you.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4">
        {/* Honeypot — hidden from real visitors via CSS, bots that
            auto-fill every field will trip it. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
        />
        <Field label="Name" name="name" required placeholder="Your name" />
        <Field label="Phone" name="phone" required placeholder="03XX-XXXXXXX" type="tel" />
        <Field
          label="WhatsApp Number"
          name="whatsapp"
          placeholder="Same as phone, if different"
          type="tel"
        />
        <Field label="Email" name="email" placeholder="you@example.com" type="email" />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Message</span>
          <textarea
            name="message"
            required
            rows={4}
            defaultValue={`I'm interested in ${propertyTitle}. Please share complete details.`}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
          />
        </label>
        <label className="flex items-start gap-2.5 text-xs text-muted">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
          />
          I agree to be contacted regarding this property.
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "submitting" ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-4 w-4" /> Request Details
          </>
        )}
      </button>

      {error && <p className="mt-3 text-sm font-semibold text-primary">{error}</p>}
      {status === "success" && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> Thank you! Your inquiry has been received. Our
          team will contact you soon.
        </p>
      )}
      {status === "error" && !error && (
        <p className="mt-3 text-sm font-semibold text-primary">
          Something went wrong. Please try WhatsApp instead.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
