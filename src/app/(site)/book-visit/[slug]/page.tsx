import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { settingsService } from "@/services/settingsService";
import { site } from "@/lib/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BookVisitForm } from "@/components/BookVisitForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule a Site Visit",
  robots: { index: false, follow: false },
};

export default async function BookVisitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [property, settings] = await Promise.all([
    propertyService.getBySlug(slug),
    settingsService.get().catch(() => null),
  ]);
  if (!property) notFound();

  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: property.title, href: `/properties/${property.slug}` },
            { label: "Schedule a Site Visit" },
          ]}
        />

        <Link
          href={`/properties/${property.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Property
        </Link>

        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-surface-muted p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized={property.images[0]?.startsWith("data:")}
            />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-ink">Schedule a Site Visit</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {property.title} · {property.location}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <BookVisitForm
            propertyId={property.id}
            propertySlug={property.slug}
            propertyTitle={property.title}
            whatsappNumber={settings?.whatsapp || site.whatsappNumber}
          />
        </div>
      </div>
    </main>
  );
}
