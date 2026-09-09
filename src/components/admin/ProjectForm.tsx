"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { projectStatuses, type Project } from "@/lib/models/project";
import type { ProjectFormState } from "@/lib/actions/projects.actions";
import { ImageUploader } from "./ImageUploader";
import { DocumentUploader } from "./DocumentUploader";

export function ProjectForm({
  action,
  initialValues,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  initialValues?: Project;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Project Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project Name" name="name" required defaultValue={initialValues?.name} className="sm:col-span-2" />
          <Field label="Project Type" name="type" required defaultValue={initialValues?.type} placeholder="Residential, Commercial..." />
          <Field label="Location" name="location" required defaultValue={initialValues?.location} placeholder="e.g. Johar Town, Lahore" />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Status</span>
            <select
              name="status"
              defaultValue={initialValues?.status ?? "Upcoming"}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              {projectStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Description</h2>
        <div className="mt-4 space-y-4">
          <TextArea
            label="Short Description"
            name="shortDescription"
            defaultValue={initialValues?.shortDescription}
            rows={2}
            placeholder="One or two lines shown on the project card and grid."
          />
          <TextArea
            label="Full Description (Overview)"
            name="description"
            defaultValue={initialValues?.description}
            rows={5}
          />
          <TextArea
            label="Highlights (one per line)"
            name="highlights"
            defaultValue={initialValues?.highlights?.join("\n")}
            rows={4}
            placeholder={"Prime location\nGated community\n24/7 security"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Property Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextArea
            label="Available Property Types (one per line)"
            name="propertyTypes"
            defaultValue={initialValues?.propertyTypes?.join("\n")}
            rows={4}
            placeholder={"Houses\nFlats\nResidential Plots"}
          />
          <TextArea
            label="Payment Options (one per line)"
            name="paymentOptions"
            defaultValue={initialValues?.paymentOptions?.join("\n")}
            rows={4}
            placeholder={"Cash\nEasy Monthly Installments\n3 Year Plan"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Media</h2>
        <p className="mt-1 text-xs text-muted">
          Upload photos (previewed instantly) or paste hosted image URLs. The first image is used as
          the cover photo — use &quot;Set Cover&quot; on any thumbnail to reorder.
        </p>
        <div className="mt-4">
          <ImageUploader name="images" initialImages={initialValues?.images} />
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink">Documents</h3>
          <p className="mt-1 text-xs text-muted">
            Optional — project brochure or payment plan PDF. Only shown publicly if you add one.
          </p>
          <div className="mt-3">
            <DocumentUploader name="documents" initialDocuments={initialValues?.documents} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Location</h2>
        <div className="mt-4">
          <Field
            label="Google Maps URL or Search Query"
            name="mapsUrl"
            defaultValue={initialValues?.mapsUrl ?? initialValues?.location}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Call To Action</h2>
        <p className="mt-1 text-xs text-muted">
          Optional — overrides the site&apos;s default WhatsApp number for inquiries on this project
          only. Leave blank to use the number set in Website Settings.
        </p>
        <div className="mt-4">
          <Field label="WhatsApp Number" name="whatsappNumber" defaultValue={initialValues?.whatsappNumber} placeholder="+92 3XX XXXXXXX" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/30 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save Project"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save & Publish"}
        </button>
        <a
          href="/admin/projects"
          className="rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/30"
        >
          Cancel
        </a>
        {initialValues && (
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {initialValues.published ? "Currently published" : "Currently a draft (not visible on the public site)"}
          </span>
        )}
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
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ""}`}>
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}
