"use client";

import { useState, type FormEvent } from "react";
import { PhoneCall, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { getAttributionPayload } from "@/lib/attribution";

type Status = "idle" | "submitting" | "success" | "error";

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

const PREFERRED_TIMES = ["Anytime", "Morning", "Afternoon", "Evening"];

/** Request Callback (STEP 17, section 30) — a distinct, lightweight
 *  capture point: name + phone + preferred time, nothing else required.
 *  Goes through the same /api/contact endpoint as every other lead
 *  form, tagged lead_type=Callback Request and status=New. */
export function RequestCallbackForm() {
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
      setError("Please enter your name and phone number.");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          message: `Requested a callback. ${data.message ? String(data.message) : ""}`.trim(),
          leadType: "Callback Request",
          source: "Website",
          consent: true,
          ...getAttributionPayload(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Request failed");
      setStatus("success");
      trackEvent("callback_request");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface-muted p-6">
      <h3 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <PhoneCall className="h-4.5 w-4.5 text-primary" /> Prefer We Call You?
      </h3>
      <p className="mt-1 text-sm text-muted">Leave your number and preferred time — we&apos;ll call you back.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <input
          type="tel"
          name="phone"
          required
          placeholder="03XX-XXXXXXX"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <select
          name="preferredTime"
          defaultValue="Anytime"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary sm:col-span-2"
        >
          {PREFERRED_TIMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : "Request Callback"}
      </button>

      {error && <p className="mt-3 text-sm font-semibold text-primary">{error}</p>}
      {status === "success" && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> Got it — we&apos;ll call you back soon.
        </p>
      )}
      {status === "error" && !error && <p className="mt-3 text-sm font-semibold text-primary">Something went wrong. Please try WhatsApp instead.</p>}
    </form>
  );
}
