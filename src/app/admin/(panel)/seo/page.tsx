import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Map as MapIcon,
  BarChart3,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { settingsService } from "@/services/settingsService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { SeoSettingsForm } from "@/components/admin/SeoSettingsForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div>
        <div className="text-sm font-bold text-ink">{label}</div>
        <div className="text-xs text-muted">{detail}</div>
      </div>
    </div>
  );
}

export default async function AdminSeoPage() {
  await requireSection("seo");
  const [settings, properties, projects] = await Promise.all([
    settingsService.get(),
    propertyService.list().catch(() => []),
    projectService.list().catch(() => []),
  ]);

  const gaConfigured = !!process.env.NEXT_PUBLIC_GA_ID;
  const verificationConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const mapsApiConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const missingDescription = properties.filter((p) => !p.description.trim());
  const missingImages = properties.filter((p) => p.images.length === 0);
  const draftProjects = projects.filter((p) => !p.published);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">SEO</h1>
        <p className="mt-1 text-sm text-muted">
          Indexing readiness, analytics configuration, and site-wide SEO defaults.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Indexing Readiness
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatusRow ok label="Sitemap" detail="/sitemap.xml — generated automatically from published pages, properties and projects." />
          <StatusRow ok label="Robots.txt" detail="/robots.txt — allows public pages, blocks /admin and /api." />
          <StatusRow
            ok={verificationConfigured}
            label="Google Search Console"
            detail={verificationConfigured ? "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION is set." : "Not configured — see checklist below."}
          />
          <StatusRow
            ok={gaConfigured}
            label="Google Analytics"
            detail={gaConfigured ? "NEXT_PUBLIC_GA_ID is set — tracking is active." : "Not configured — no analytics scripts are loaded."}
          />
          <StatusRow
            ok={mapsApiConfigured}
            label="Google Maps API Key"
            detail={
              mapsApiConfigured
                ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set (not currently used — maps use a plain embed)."
                : "Not set — not required. Maps use a plain Google Maps embed with no API key."
            }
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <FileText className="h-3.5 w-3.5" /> View sitemap.xml <ExternalLink className="h-3 w-3" />
          </a>
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <MapIcon className="h-3.5 w-3.5" /> View robots.txt <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <BarChart3 className="h-4.5 w-4.5 text-primary" /> Content Warnings
        </h2>
        <div className="mt-4 space-y-2.5">
          {missingDescription.length === 0 && missingImages.length === 0 && draftProjects.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> No SEO content issues found.
            </p>
          ) : (
            <>
              {missingDescription.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{missingDescription.length}</strong> propert{missingDescription.length === 1 ? "y" : "ies"} need
                    {missingDescription.length === 1 ? "s" : ""} an SEO description —{" "}
                    {missingDescription.slice(0, 5).map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ", "}
                        <Link href={`/admin/properties/${p.id}/edit`} className="font-semibold underline">
                          {p.title}
                        </Link>
                      </span>
                    ))}
                    {missingDescription.length > 5 && ` and ${missingDescription.length - 5} more`}.
                  </span>
                </div>
              )}
              {missingImages.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{missingImages.length}</strong> propert{missingImages.length === 1 ? "y" : "ies"} have no images
                    — this affects social sharing previews.
                  </span>
                </div>
              )}
              {draftProjects.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/50 p-3.5 text-sm text-muted">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{draftProjects.length}</strong> project{draftProjects.length === 1 ? "" : "s"} still in draft —
                    not visible on the public site or sitemap until published.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Site SEO Defaults</h2>
        <p className="mt-1 text-xs text-muted">
          Fallbacks used when a specific page doesn&apos;t set its own title/description/image.
        </p>
        <div className="mt-4">
          <SeoSettingsForm settings={settings} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Google Business Profile Checklist</h2>
        <p className="mt-1 text-xs text-muted">
          This is a manual checklist — none of these steps have been completed automatically, and
          this dashboard cannot verify your Google Business Profile status.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>
            Go to{" "}
            <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              business.google.com
            </a>{" "}
            and sign in with the business&apos;s Google account.
          </li>
          <li>Add the business using the exact name, address and phone set in Website Settings → Local Business Information.</li>
          <li>Choose the correct category (e.g. &quot;Real Estate Agency&quot;).</li>
          <li>Verify ownership — Google will mail a postcard with a code, or offer phone/email verification depending on eligibility.</li>
          <li>Once verified, add photos, business hours and a description matching the site.</li>
          <li>Keep the address, phone and hours on Google in sync with Website Settings so structured data and the profile don&apos;t contradict each other.</li>
        </ol>
      </section>
    </div>
  );
}
