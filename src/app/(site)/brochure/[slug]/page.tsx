import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Download, MessageCircle, Phone, Mail } from "lucide-react";
import { brochureService } from "@/services/brochureService";
import { formatPKR } from "@/lib/calculator";
import { whatsappUrlFor } from "@/lib/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrochureDownloadLink } from "@/components/BrochureDownloadLink";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brochure = await brochureService.getBySlugPublic(slug);
  if (!brochure) return { title: "Brochure Not Found" };

  const { target } = await brochureService.buildRenderData(brochure.id);
  return {
    title: `${target.name} — Brochure`,
    description: target.description || `${target.name} in ${target.location}.`,
    alternates: { canonical: `/brochure/${brochure.slug}` },
    openGraph: {
      title: `${target.name} — Brochure | 5STAR.M Estate & Builders`,
      description: target.location,
      images: target.images[0] ? [{ url: target.images[0], width: 1200, height: 630, alt: target.name }] : undefined,
    },
  };
}

export default async function PublicBrochurePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brochure = await brochureService.getBySlugPublic(slug);
  if (!brochure) notFound();

  const { business, target, paymentPlanInfo } = await brochureService.buildRenderData(brochure.id);
  const detailHref = brochure.type === "property" ? `/properties/${target.slug}` : `/projects/${target.slug}`;
  const whatsappMessage = `Assalam-o-Alaikum, I am interested in ${target.name}. Please share complete details.`;

  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8 lg:py-14">
        <Breadcrumbs items={[{ label: brochure.type === "property" ? "Properties" : "Projects", href: brochure.type === "property" ? "/properties" : "/projects" }, { label: target.name }]} />

        {target.images[0] && (
          <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image src={target.images[0]} alt={target.name} fill sizes="900px" className="object-cover" unoptimized={target.images[0].startsWith("data:")} />
          </div>
        )}

        <h1 className="mt-6 font-heading text-2xl font-extrabold text-ink sm:text-3xl">{target.name}</h1>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-4 w-4 text-primary" /> {target.location}
        </div>

        {target.description && <p className="mt-4 text-base leading-relaxed text-muted">{target.description}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={detailHref}
            className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
          >
            View Full Details
          </Link>
          {brochure.generatedFile ? (
            <BrochureDownloadLink
              href={brochure.generatedFile}
              title={target.name}
              propertyId={brochure.propertyId}
              projectId={brochure.projectId}
              projectTitle={target.name}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              <Download className="h-4 w-4" /> Download PDF
            </BrochureDownloadLink>
          ) : (
            <span className="rounded-full border-2 border-border px-5 py-2.5 text-sm font-bold text-muted-foreground">
              PDF not yet available
            </span>
          )}
        </div>

        {target.images.length > 1 && (
          <div className="mt-10">
            <h2 className="font-heading text-base font-bold text-ink">Gallery</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {target.images.slice(1, 10).map((src: string, i: number) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image src={src} alt={`${target.name} ${i + 2}`} fill sizes="220px" className="object-cover" unoptimized={src.startsWith("data:")} />
                </div>
              ))}
            </div>
          </div>
        )}

        {paymentPlanInfo && (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-heading text-base font-bold text-ink">Payment Plan</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PlanTile label="Price" value={formatPKR(paymentPlanInfo.propertyPrice)} />
              <PlanTile label="Down Payment" value={formatPKR(paymentPlanInfo.downPayment)} />
              {paymentPlanInfo.installmentAmount !== undefined && (
                <PlanTile label={`Installment (${paymentPlanInfo.frequency})`} value={formatPKR(paymentPlanInfo.installmentAmount)} />
              )}
              <PlanTile label="Duration" value={`${paymentPlanInfo.duration} ${paymentPlanInfo.frequency.toLowerCase()}`} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Payment details are subject to confirmation by 5STAR.M Estate &amp; Builders.
            </p>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-border bg-ink p-6 text-center sm:p-8">
          <h2 className="font-heading text-xl font-extrabold text-white">Interested in This {brochure.type === "property" ? "Property" : "Project"}?</h2>
          <p className="mt-2 text-sm text-white/70">Contact {business.name} Estate &amp; Builders</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
            <a
              href={whatsappUrlFor(business.whatsappNumber, whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-success px-5 py-2.5 font-bold text-white hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
            <a href={`tel:${business.phone}`} className="flex items-center gap-2 rounded-full border-2 border-white/25 px-5 py-2.5 font-bold text-white">
              <Phone className="h-4 w-4" /> {business.phone}
            </a>
            <a href={`mailto:${business.email}`} className="flex items-center gap-2 rounded-full border-2 border-white/25 px-5 py-2.5 font-bold text-white">
              <Mail className="h-4 w-4" /> {business.email}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

function PlanTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-heading text-base font-extrabold text-ink">{value}</div>
    </div>
  );
}
