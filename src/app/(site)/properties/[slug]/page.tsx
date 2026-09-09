import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderKanban, Phone } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { settingsService } from "@/services/settingsService";
import { site, whatsappUrlFor } from "@/lib/site";
import { MediaGallery } from "@/components/MediaGallery";
import { PropertyInquiryForm } from "@/components/PropertyInquiryForm";
import { PropertyWhatsAppButton } from "@/components/PropertyWhatsAppButton";
import { PropertyInfoPanel } from "@/components/PropertyInfoPanel";
import { PropertyFeaturesGrid } from "@/components/PropertyFeaturesGrid";
import { PropertyPaymentPlan } from "@/components/PropertyPaymentPlan";
import { PropertyLocationSection } from "@/components/PropertyLocationSection";
import { PropertyCTASection } from "@/components/PropertyCTASection";
import { PropertyDocuments } from "@/components/PropertyDocuments";
import { RelatedProperties } from "@/components/RelatedProperties";
import { ShareButtons } from "@/components/ShareButtons";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PropertyViewTracker } from "@/components/PropertyViewTracker";
import { PhoneLink } from "@/components/PhoneLink";
import type { Property } from "@/lib/models/property";

// Properties are added/edited/removed live via the admin dashboard, so
// this route is rendered per-request rather than pre-built at deploy time.
export const dynamic = "force-dynamic";

/** "5 Marla House for Sale in Lahore" — built from real property fields,
 *  never invented. */
function seoTitle(property: Property) {
  const purpose = property.purpose.replace(/^For /, "");
  const city = property.locationArea === "Johar Town" ? "Johar Town, Lahore" : "Lahore";
  return `${property.size} ${property.type} for ${purpose} in ${city}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await propertyService.getBySlug(slug);
  if (!property) return { title: "Property Not Found" };

  const title = seoTitle(property);
  const description =
    property.description || `${title}. Contact 5STAR.M Estate & Builders for complete details and payment plans.`;
  const image = property.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title: `${title} | 5STAR.M Estate & Builders`,
      description: `${property.location} · ${description}`,
      url: `/properties/${property.slug}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PropertyDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [property, settings] = await Promise.all([
    propertyService.getBySlug(slug),
    settingsService.get().catch(() => null),
  ]);
  if (!property) notFound();

  const [project, related] = await Promise.all([
    property.projectId ? projectService.getById(property.projectId) : Promise.resolve(undefined),
    propertyService.listRelated(property, 4),
  ]);

  const whatsappDisplayName = settings?.whatsappDisplayName || site.fullName;
  const whatsappMessage = `Assalam-o-Alaikum ${whatsappDisplayName},\n\nI am interested in:\n\nProperty: ${property.title}\nLocation: ${property.location}\nSize: ${property.size}\n\nPlease share the complete details, price and payment plan.\n\nThank you.`;
  const pageUrl = `${site.url}/properties/${property.slug}`;
  const shareText = `Check out this property from 5STAR.M Estate & Builders:\n\n${property.title}\n${property.location}`;

  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.title,
    description: property.description || undefined,
    image: property.images,
    url: pageUrl,
  };
  if (property.priceValue) {
    productJsonLd.offers = {
      "@type": "Offer",
      price: property.priceValue,
      priceCurrency: "PKR",
      availability:
        property.status === "Available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: pageUrl,
    };
  }

  return (
    <main className="bg-surface">
      <JsonLd data={productJsonLd} />
      <PropertyViewTracker propertyId={property.id} propertyType={property.type} locationArea={property.locationArea} />

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: property.title },
          ]}
        />

        <Link
          href="/properties"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="space-y-8 lg:col-span-2">
            <div>
              <MediaGallery images={property.images} title={property.title} />

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

              {project && (
                <Link
                  href={`/projects/${project.slug}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <FolderKanban className="h-4 w-4" /> Part of {project.name}
                </Link>
              )}

              <p className="mt-6 text-base leading-relaxed text-muted">{property.description}</p>

              <div className="mt-4">
                <ShareButtons url={pageUrl} text={shareText} />
              </div>
            </div>

            <PropertyInfoPanel property={property} />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <PropertyFeaturesGrid features={property.features} title="Features" />
              <PropertyFeaturesGrid features={property.amenities} title="Amenities" />
            </div>

            <PropertyPaymentPlan paymentOption={property.paymentOption} plan={property.paymentPlan} />

            <PropertyDocuments documents={property.documents} />

            <PropertyLocationSection location={property.location} mapsQuery={property.mapsQuery} />
          </div>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-border bg-surface-muted p-6">
              <div className="text-2xl font-extrabold text-primary">{property.price}</div>
              <div className="mt-1 text-sm font-medium text-muted">{property.paymentOption}</div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <PhoneLink
                  phoneHref={site.phoneHref}
                  context="property_detail_sidebar"
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  <Phone className="h-4 w-4" /> Call
                </PhoneLink>
                <PropertyWhatsAppButton
                  propertyId={property.id}
                  propertyTitle={property.title}
                  message={whatsappMessage}
                  whatsappNumber={settings?.whatsapp}
                />
              </div>
            </div>

            <div id="inquiry-form" className="mt-5 scroll-mt-24">
              <PropertyInquiryForm propertyId={property.id} propertyTitle={property.title} />
            </div>
          </div>
        </div>

        <div className="mt-14">
          <PropertyCTASection
            whatsappHref={
              settings?.whatsapp ? whatsappUrlFor(settings.whatsapp, whatsappMessage) : whatsappUrlFor(site.whatsappNumber, whatsappMessage)
            }
            callHref={`tel:${site.phoneHref}`}
          />
        </div>

        {related.length > 0 && (
          <div className="mt-14">
            <RelatedProperties properties={related} />
          </div>
        )}
      </div>
    </main>
  );
}
