"use client";

import { useActionState, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  propertyTypes,
  purposes,
  propertyStatuses,
  paymentOptions,
  locationAreas,
  sizeCategories,
  type Property,
  type SizeCategory,
} from "@/lib/models/property";
import type { Project } from "@/lib/models/project";
import type { PropertyFormState } from "@/lib/actions/properties.actions";
import { ImageUploader } from "./ImageUploader";
import { VideoUploader } from "./VideoUploader";
import { DocumentUploader } from "./DocumentUploader";

// Leaflet touches `window` at import time — this file is already a
// Client Component, so ssr:false can be called directly here (no
// separate wrapper needed, unlike a Server Component caller).
const PropertyLocationPicker = dynamic(() => import("./PropertyLocationPicker").then((m) => m.PropertyLocationPicker), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-surface-muted" />,
});

export function PropertyForm({
  action,
  initialValues,
  submitLabel,
  projects,
}: {
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  initialValues?: Property;
  submitLabel: string;
  projects: Project[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [sizeCategory, setSizeCategory] = useState<SizeCategory>(initialValues?.sizeCategory ?? sizeCategories[0]);
  const sizeInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Basic Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property Title" name="title" required defaultValue={initialValues?.title} className="sm:col-span-2" />
          <Select label="Property Type" name="type" options={propertyTypes} defaultValue={initialValues?.type} />
          <Select label="Purpose" name="purpose" options={purposes} defaultValue={initialValues?.purpose} />
          <Field label="Location (display)" name="location" required defaultValue={initialValues?.location} placeholder="e.g. Johar Town, Lahore" />
          <Field label="City" name="city" defaultValue={initialValues?.city ?? "Lahore"} placeholder="Lahore" />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Size Category</span>
            <select
              name="sizeCategory"
              value={sizeCategory}
              onChange={(e) => {
                const next = e.target.value as SizeCategory;
                setSizeCategory(next);
                if (next === "Custom") sizeInputRef.current?.focus();
              }}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
            >
              {sizeCategories.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">
              {sizeCategory === "Custom" ? "Custom Size" : "Size (display)"} <span className="text-primary">*</span>
            </span>
            <input
              ref={sizeInputRef}
              type="text"
              name="size"
              required
              defaultValue={initialValues?.size}
              placeholder={sizeCategory === "Custom" ? "Type the exact size, e.g. 2 Kanal 3 Marla" : "e.g. 10 Marla"}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
            />
          </label>
          <Field
            label="Bedrooms (residential only — optional)"
            name="bedrooms"
            type="number"
            defaultValue={initialValues?.bedrooms}
          />
          <Field
            label="Bathrooms (residential only — optional)"
            name="bathrooms"
            type="number"
            defaultValue={initialValues?.bathrooms}
          />
          <Field label="Price (display)" name="price" required defaultValue={initialValues?.price} placeholder="e.g. PKR 2.5 Crore" />
          <Select label="Status" name="status" options={propertyStatuses} defaultValue={initialValues?.status} />
        </div>
        <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initialValues?.featured}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Featured Property (shown on homepage)
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Description</h2>
        <div className="mt-4">
          <TextArea label="Description" name="description" required defaultValue={initialValues?.description} rows={4} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Photos &amp; Video</h2>
        <p className="mt-1 text-xs text-muted">
          Upload photos (previewed instantly) or paste hosted image URLs — the first image is the main photo.
          A walkthrough video is optional.
        </p>
        <div className="mt-4">
          <ImageUploader name="images" initialImages={initialValues?.images} />
        </div>
        <div className="mt-4">
          <VideoUploader name="videoUrl" initialVideo={initialValues?.videoUrl} />
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-bold text-primary"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showAdvanced ? "Hide advanced options" : "Show advanced options (filters, payment plan, SEO, map...)"}
      </button>

      {showAdvanced && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Search &amp; Filter Details</h2>
            <p className="mt-1 text-xs text-muted">
              Optional — powers the public site&apos;s advanced search filters. The property still lists fine without these.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Location Area (filter)" name="locationArea" options={locationAreas} defaultValue={initialValues?.locationArea} />
              <Field
                label="Size in Sq. Ft. (for advanced search)"
                name="sizeSqft"
                type="number"
                defaultValue={initialValues?.sizeSqft}
                placeholder="e.g. 2250"
              />
              <Field
                label="Price Value (PKR, for filtering)"
                name="priceValue"
                type="number"
                defaultValue={initialValues?.priceValue}
              />
              <Select label="Payment Option" name="paymentOption" options={paymentOptions} defaultValue={initialValues?.paymentOption} />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Project</span>
                <select
                  name="projectId"
                  defaultValue={initialValues?.projectId ?? ""}
                  className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
                >
                  <option value="">No Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Features &amp; Amenities</h2>
            <div className="mt-4 space-y-4">
              <TextArea
                label="Features (one per line)"
                name="features"
                defaultValue={initialValues?.features?.join("\n")}
                rows={4}
                placeholder={"5 Bedrooms\nModern Kitchen\nCar Porch"}
              />
              <TextArea
                label="Amenities (one per line)"
                name="amenities"
                defaultValue={initialValues?.amenities?.join("\n")}
                rows={4}
                placeholder={"24/7 Security\nMosque Nearby\nPark Nearby"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Payment Plan</h2>
            <p className="mt-1 text-xs text-muted">
              All optional — only fill in what applies. Leave blank to hide the payment plan section on
              the public page entirely.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Total Price (PKR)"
                name="paymentTotalPrice"
                type="number"
                defaultValue={initialValues?.paymentPlan?.totalPrice}
              />
              <Field
                label="Down Payment (PKR)"
                name="paymentDownPayment"
                type="number"
                defaultValue={initialValues?.paymentPlan?.downPayment}
              />
              <Field
                label="Monthly Installment (PKR)"
                name="paymentMonthlyInstallment"
                type="number"
                defaultValue={initialValues?.paymentPlan?.monthlyInstallment}
              />
              <Field
                label="Duration (months)"
                name="paymentDurationMonths"
                type="number"
                defaultValue={initialValues?.paymentPlan?.durationMonths}
              />
              <Field
                label="Number of Installments"
                name="paymentInstallmentsCount"
                type="number"
                defaultValue={initialValues?.paymentPlan?.installmentsCount}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Documents</h2>
            <p className="mt-1 text-xs text-muted">
              Optional — brochure, floor plan or payment plan PDF. Only shown publicly if you add one.
            </p>
            <div className="mt-4">
              <DocumentUploader name="documents" initialDocuments={initialValues?.documents} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Google Maps Location</h2>
            <p className="mt-1 text-xs text-muted">
              Used to center the map on the property&apos;s detail page — usually the same as the display location.
            </p>
            <div className="mt-4">
              <Field label="Maps Search Query" name="mapsQuery" defaultValue={initialValues?.mapsQuery ?? initialValues?.location} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Map Coordinates</h2>
            <p className="mt-1 text-xs text-muted">
              Powers the interactive Map Search on the public site (List/Map/Split view). Optional — a
              property without coordinates simply won&apos;t appear on the map, everything else keeps working.
            </p>
            <div className="mt-4">
              <PropertyLocationPicker initialLatitude={initialValues?.latitude} initialLongitude={initialValues?.longitude} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">SEO Overrides (optional)</h2>
            <p className="mt-1 text-xs text-muted">
              Leave blank to use the property&apos;s own title/description — these only override what search
              engines and social shares see.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="SEO Title" name="seoTitle" defaultValue={initialValues?.seoTitle} />
              <Field label="Social Share Image URL" name="ogImage" defaultValue={initialValues?.ogImage} />
            </div>
            <div className="mt-4">
              <Field label="SEO Description" name="seoDescription" defaultValue={initialValues?.seoDescription} className="w-full" />
            </div>
          </section>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <a
          href="/admin/properties"
          className="rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/30"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  type?: string;
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
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly T[];
  defaultValue?: T;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
