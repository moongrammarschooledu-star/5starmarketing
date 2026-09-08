"use client";

import { useState, type FormEvent } from "react";
import { Phone, Mail, MapPin, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { site, whatsappLink } from "@/lib/site";

const interests = [
  "House",
  "Flat",
  "Residential Plot",
  "Commercial Property",
  "Construction Services",
  "Other",
];

type Status = "idle" | "submitting" | "success" | "error";

export function Contact() {
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
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow="Get In Touch"
          title="Contact"
          highlight="Us"
          description="Have a question about a property, investment or construction project? Reach out — we usually reply fastest on WhatsApp."
          align="center"
        />

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-surface-muted p-6">
              <div className="font-heading text-lg font-bold text-ink">{site.director}</div>
              <div className="text-sm font-semibold text-primary">{site.directorTitle}</div>

              <div className="mt-5 space-y-4 text-sm">
                <a href={`tel:${site.phoneHref}`} className="flex items-center gap-3 text-ink/85 hover:text-primary">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" />
                  </span>
                  {site.phoneDisplay}
                </a>
                <a
                  href={whatsappLink("Hi 5STAR.M, I'd like to get in touch.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-ink/85 hover:text-primary"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  WhatsApp: {site.phoneDisplay}
                </a>
                <a href={`mailto:${site.email}`} className="flex items-center gap-3 text-ink/85 hover:text-primary">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </span>
                  {site.email}
                </a>
                <div className="flex items-start gap-3 text-ink/85">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  {site.address}
                </div>
              </div>

              <a
                href={whatsappLink("Hi 5STAR.M, I'm interested in your properties.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
              </a>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-border">
              <iframe
                title="5STAR.M Estate & Builders location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  site.mapsQuery
                )}&z=15&output=embed`}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-surface p-6 shadow-sm lg:col-span-3"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name" name="name" required placeholder="Your name" />
              <Field label="Phone Number" name="phone" required placeholder="03XX-XXXXXXX" type="tel" />
              <Field label="Email" name="email" placeholder="you@example.com" type="email" className="sm:col-span-2" />

              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-semibold text-ink">Property Interest</span>
                <select
                  name="interest"
                  className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
                >
                  {interests.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-semibold text-ink">Message</span>
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="Tell us what you're looking for..."
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
                  <Send className="h-4 w-4" /> Submit Inquiry
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
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
  className,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ""}`}>
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
