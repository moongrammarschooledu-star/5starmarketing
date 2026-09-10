"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { Campaign, CampaignInput } from "@/lib/models/campaign";
import { campaignPlatforms, campaignTypes, campaignStatuses } from "@/lib/models/campaign";
import { createCampaignAction, updateCampaignAction } from "@/lib/actions/marketing.actions";
import { slugifyUtmCampaign } from "@/lib/campaignSlug";
import { useToast } from "./ToastProvider";

export function CampaignForm({
  campaign,
  properties,
  projects,
}: {
  campaign?: Campaign;
  properties: { id: string; title: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(campaign?.name ?? "");
  const [utmCampaign, setUtmCampaign] = useState(campaign?.utmCampaign ?? "");
  const [slugTouched, setSlugTouched] = useState(!!campaign);
  const [linkTarget, setLinkTarget] = useState<"none" | "property" | "project">(
    campaign?.propertyId ? "property" : campaign?.projectId ? "project" : "none"
  );

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setUtmCampaign(slugifyUtmCampaign(value));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const input: CampaignInput = {
      name: String(form.get("name") ?? "").trim(),
      platform: form.get("platform") as CampaignInput["platform"],
      campaignType: form.get("campaignType") as CampaignInput["campaignType"],
      status: form.get("status") as CampaignInput["status"],
      startDate: String(form.get("startDate") ?? "").trim() || undefined,
      endDate: String(form.get("endDate") ?? "").trim() || undefined,
      plannedBudget: form.get("plannedBudget") ? Number(form.get("plannedBudget")) : undefined,
      actualSpend: form.get("actualSpend") ? Number(form.get("actualSpend")) : undefined,
      revenueGenerated: form.get("revenueGenerated") ? Number(form.get("revenueGenerated")) : undefined,
      targetAudience: String(form.get("targetAudience") ?? "").trim() || undefined,
      propertyId: linkTarget === "property" ? String(form.get("propertyId") ?? "") || undefined : undefined,
      projectId: linkTarget === "project" ? String(form.get("projectId") ?? "") || undefined : undefined,
      landingPage: String(form.get("landingPage") ?? "").trim() || undefined,
      utmSource: String(form.get("utmSource") ?? "").trim() || undefined,
      utmMedium: String(form.get("utmMedium") ?? "").trim() || undefined,
      utmCampaign: String(form.get("utmCampaign") ?? "").trim(),
      utmContent: String(form.get("utmContent") ?? "").trim() || undefined,
      utmTerm: String(form.get("utmTerm") ?? "").trim() || undefined,
      description: String(form.get("description") ?? "").trim() || undefined,
    };

    if (!input.name || !input.utmCampaign) {
      setError("Campaign name and UTM campaign slug are required.");
      return;
    }

    setPending(true);
    try {
      if (campaign) {
        await updateCampaignAction(campaign.id, input);
        toast.show("Campaign updated.");
        router.push(`/admin/marketing/campaigns/${campaign.id}`);
      } else {
        const created = await createCampaignAction(input);
        toast.show("Campaign created.");
        router.push(`/admin/marketing/campaigns/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this campaign.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Campaign Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-ink">Campaign Name *</span>
            <input name="name" required value={name} onChange={(e) => handleNameChange(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Platform *</span>
            <select name="platform" defaultValue={campaign?.platform ?? "Facebook"} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
              {campaignPlatforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Campaign Type *</span>
            <select name="campaignType" defaultValue={campaign?.campaignType ?? "Lead Generation"} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
              {campaignTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Status</span>
            <select name="status" defaultValue={campaign?.status ?? "Draft"} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
              {campaignStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Start Date</span>
            <input type="date" name="startDate" defaultValue={campaign?.startDate ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">End Date</span>
            <input type="date" name="endDate" defaultValue={campaign?.endDate ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-ink">Target Audience</span>
            <input name="targetAudience" placeholder="e.g. Overseas Pakistanis, DHA investors" defaultValue={campaign?.targetAudience ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-ink">Description</span>
            <textarea name="description" rows={3} defaultValue={campaign?.description ?? ""} className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Property / Project & Landing Page</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["none", "property", "project"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLinkTarget(opt)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${linkTarget === opt ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"}`}
            >
              {opt === "none" ? "General / Brand Campaign" : opt === "property" ? "Existing Property" : "Existing Project"}
            </button>
          ))}
        </div>
        {linkTarget === "property" && (
          <select name="propertyId" defaultValue={campaign?.propertyId ?? ""} className="mt-4 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Select a property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
        {linkTarget === "project" && (
          <select name="projectId" defaultValue={campaign?.projectId ?? ""} className="mt-4 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Custom Landing Page (optional)</span>
          <input name="landingPage" placeholder="/campaign/5-marla-lahore" defaultValue={campaign?.landingPage ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          <span className="text-xs text-muted">Leave blank to send traffic to the homepage, or a property/project page above.</span>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">UTM Tracking</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-ink">UTM Campaign Slug *</span>
            <input
              name="utmCampaign"
              required
              value={utmCampaign}
              onChange={(e) => {
                setSlugTouched(true);
                setUtmCampaign(e.target.value);
              }}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
            <span className="text-xs text-muted">Incoming traffic with utm_campaign={utmCampaign || "…"} attributes here. Must be unique.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">UTM Source</span>
            <input name="utmSource" placeholder="facebook" defaultValue={campaign?.utmSource ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">UTM Medium</span>
            <input name="utmMedium" placeholder="paid" defaultValue={campaign?.utmMedium ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">UTM Content</span>
            <input name="utmContent" placeholder="video_01" defaultValue={campaign?.utmContent ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">UTM Term</span>
            <input name="utmTerm" defaultValue={campaign?.utmTerm ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Budget</h2>
        <p className="mt-1 text-xs text-muted">All figures in PKR (Rs.). Leave blank if not tracked.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Planned Budget (Rs.)</span>
            <input type="number" min="0" step="any" name="plannedBudget" defaultValue={campaign?.plannedBudget ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Actual Spend (Rs.)</span>
            <input type="number" min="0" step="any" name="actualSpend" defaultValue={campaign?.actualSpend ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Revenue Generated (Rs.)</span>
            <input type="number" min="0" step="any" name="revenueGenerated" defaultValue={campaign?.revenueGenerated ?? ""} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          Only enter revenue once it&apos;s actually verified/collected — this is never estimated from a property&apos;s asking price.
        </p>
      </section>

      <button type="submit" disabled={pending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {pending ? "Saving..." : campaign ? "Save Changes" : "Create Campaign"}
      </button>
    </form>
  );
}
