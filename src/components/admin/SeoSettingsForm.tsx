"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { WebsiteSettings } from "@/lib/models/settings";
import { updateSeoSettingsAction, type SeoFormState } from "@/lib/actions/seo.actions";
import { ImageUploader } from "./ImageUploader";

export function SeoSettingsForm({ settings }: { settings: WebsiteSettings }) {
  const [state, formAction, pending] = useActionState<SeoFormState, FormData>(updateSeoSettingsAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> SEO settings saved.
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Site Title (fallback)</span>
        <input
          type="text"
          name="seoSiteTitle"
          defaultValue={settings.seoSiteTitle}
          placeholder="5STAR.M Estate & Builders | Real Estate & Property Solutions in Lahore"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Site Description (fallback)</span>
        <textarea
          name="seoSiteDescription"
          defaultValue={settings.seoSiteDescription}
          rows={2}
          placeholder="Used when a page doesn't set its own description."
          className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-ink">Default Social Sharing Image</span>
        <p className="mb-2 text-xs text-muted">
          Used as the Open Graph preview image when a page (or property/project) doesn&apos;t have
          its own photo.
        </p>
        <ImageUploader name="seoDefaultOgImage" initialImages={settings.seoDefaultOgImage ? [settings.seoDefaultOgImage] : []} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save SEO Settings"}
      </button>
    </form>
  );
}
