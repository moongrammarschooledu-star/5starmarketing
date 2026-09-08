"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2 } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export function PropertyInquiryForm({ propertyTitle }: { propertyTitle: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, property: propertyTitle }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
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
        <Field label="Name" name="name" required placeholder="Your name" />
        <Field label="Phone" name="phone" required placeholder="03XX-XXXXXXX" type="tel" />
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

      {status === "success" && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> Thank you — we&apos;ll get back to you shortly.
        </p>
      )}
      {status === "error" && (
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
