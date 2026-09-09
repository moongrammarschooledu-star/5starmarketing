"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { WebsiteSettings } from "@/lib/models/settings";
import { weekdays } from "@/lib/models/appointment";
import { updateSettingsAction, type SettingsFormState } from "@/lib/actions/settings.actions";
import { ImageUploader } from "./ImageUploader";

export function SettingsForm({ settings }: { settings: WebsiteSettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(updateSettingsAction, {});

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Business Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business Name" name="businessName" required defaultValue={settings.businessName} />
          <Field label="Tagline" name="tagline" defaultValue={settings.tagline} />
          <Field label="Phone" name="phone" defaultValue={settings.phone} />
          <Field label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp} />
          <Field label="Email" name="email" type="email" defaultValue={settings.email} />
          <Field label="Address" name="address" defaultValue={settings.address} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">WhatsApp Business Settings</h2>
        <p className="mt-1 text-xs text-muted">
          The WhatsApp number itself is set under Business Information above. These control how
          WhatsApp messages are drafted across the site and admin CRM.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="WhatsApp Display Name"
            name="whatsappDisplayName"
            defaultValue={settings.whatsappDisplayName}
          />
          <Field
            label="Default Greeting"
            name="whatsappDefaultGreeting"
            defaultValue={settings.whatsappDefaultGreeting}
            textarea
          />
          <Field
            label="Default Inquiry Message"
            name="whatsappDefaultInquiryMessage"
            defaultValue={settings.whatsappDefaultInquiryMessage}
            textarea
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Local Business Information</h2>
        <p className="mt-1 text-xs text-muted">
          Used for local search (LocalBusiness) structured data and as prep for a Google Business
          Profile — see the SEO Dashboard at{" "}
          <Link href="/admin/seo" className="font-semibold text-primary hover:underline">
            /admin/seo
          </Link>{" "}
          for the verification checklist.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" name="city" defaultValue={settings.city ?? "Lahore"} />
          <Field label="Country" name="country" defaultValue={settings.country ?? "Pakistan"} />
          <Field label="Latitude" name="latitude" type="number" defaultValue={settings.latitude} />
          <Field label="Longitude" name="longitude" type="number" defaultValue={settings.longitude} />
          <Field label="Website" name="websiteUrl" defaultValue={settings.websiteUrl} placeholder="https://www.5starm.com" />
          <Field
            label="Business Description"
            name="businessDescription"
            defaultValue={settings.businessDescription}
            textarea
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Appointment Settings</h2>
        <p className="mt-1 text-xs text-muted">
          Configures the site-visit booking form and calendar. These are only used once you set them
          here — nothing is claimed as real business hours by default.
        </p>

        <div className="mt-4">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Working Days</span>
          <div className="flex flex-wrap gap-3">
            {weekdays.map((day) => (
              <label key={day} className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  name="appointmentWorkingDays"
                  value={day}
                  defaultChecked={settings.appointmentWorkingDays.includes(day)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Opening Time" name="appointmentOpeningTime" type="time" defaultValue={settings.appointmentOpeningTime} />
          <Field label="Closing Time" name="appointmentClosingTime" type="time" defaultValue={settings.appointmentClosingTime} />
          <Field
            label="Slot Duration (minutes)"
            name="appointmentSlotDurationMinutes"
            type="number"
            defaultValue={settings.appointmentSlotDurationMinutes}
          />
          <Field label="Break Start (optional)" name="appointmentBreakStart" type="time" defaultValue={settings.appointmentBreakStart} />
          <Field label="Break End (optional)" name="appointmentBreakEnd" type="time" defaultValue={settings.appointmentBreakEnd} />
          <Field label="Maximum Visitors" name="appointmentMaxVisitors" type="number" defaultValue={settings.appointmentMaxVisitors} />
          <Field
            label="Minimum Booking Notice (hours)"
            name="appointmentBookingNoticeHours"
            type="number"
            defaultValue={settings.appointmentBookingNoticeHours}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Social Media</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Facebook URL" name="facebookUrl" defaultValue={settings.facebookUrl} />
          <Field label="Instagram URL" name="instagramUrl" defaultValue={settings.instagramUrl} />
          <Field label="TikTok URL" name="tiktokUrl" defaultValue={settings.tiktokUrl} />
          <Field label="YouTube URL" name="youtubeUrl" defaultValue={settings.youtubeUrl} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Logo &amp; Favicon</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Logo</span>
            <ImageUploader name="logoUrl" initialImages={settings.logoUrl ? [settings.logoUrl] : []} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Favicon</span>
            <ImageUploader name="faviconUrl" initialImages={settings.faviconUrl ? [settings.faviconUrl] : []} />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  textarea,
  className,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  type?: string;
  textarea?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ""}`}>
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          step={type === "number" ? "any" : undefined}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      )}
    </label>
  );
}
