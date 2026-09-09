import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Ruler, Phone, CheckCircle2, Tag } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { site } from "@/lib/site";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyInquiryForm } from "@/components/PropertyInquiryForm";
import { PropertyWhatsAppButton } from "@/components/PropertyWhatsAppButton";

// Properties are added/edited/removed live via the admin dashboard, so
// this route is rendered per-request rather than pre-built at deploy time.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await propertyService.getBySlug(slug);
  if (!property) return { title: "Property Not Found" };

  return {
    title: property.title,
    description: property.description,
    openGraph: {
      title: `${property.title} | 5STAR.M Estate & Builders`,
      description: property.description,
      images: [{ url: property.images[0] }],
    },
  };
}

export default async function PropertyDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await propertyService.getBySlug(slug);
  if (!property) notFound();

  const whatsappMessage = `Assalam-o-Alaikum,\nI am interested in ${property.title}.\n\nPlease share the complete details, price and payment plan.\n\nThank you.`;

  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            <PropertyGallery images={property.images} title={property.title} />

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {property.type}
              </span>
              <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {property.purpose}
              </span>
              {property.status !== "Available" && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {property.status}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
              {property.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> {property.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Ruler className="h-4 w-4 text-primary" /> {property.size}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" /> {property.paymentOption}
              </span>
            </div>

            <p className="mt-6 text-base leading-relaxed text-muted">{property.description}</p>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Features</h2>
                <ul className="mt-3 space-y-2">
                  {property.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Amenities</h2>
                <ul className="mt-3 space-y-2">
                  {property.amenities.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="font-heading text-base font-bold text-ink">Location</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                <iframe
                  title={`${property.title} location`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    property.mapsQuery || property.location
                  )}&z=14&output=embed`}
                  className="h-64 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-border bg-surface-muted p-6">
              <div className="text-2xl font-extrabold text-primary">{property.price}</div>
              <div className="mt-1 text-sm font-medium text-muted">{property.paymentOption}</div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href={`tel:${site.phoneHref}`}
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  <Phone className="h-4 w-4" /> Call
                </a>
                <PropertyWhatsAppButton
                  propertyId={property.id}
                  propertyTitle={property.title}
                  message={whatsappMessage}
                />
              </div>
            </div>

            <div className="mt-5">
              <PropertyInquiryForm propertyId={property.id} propertyTitle={property.title} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
