import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Building2, CheckCircle2, Phone, MessageCircle, User } from "lucide-react";
import { projectService } from "@/services/projectService";
import { propertyService } from "@/services/propertyService";
import { settingsService } from "@/services/settingsService";
import { site, whatsappUrlFor } from "@/lib/site";
import { MediaGallery } from "@/components/MediaGallery";
import { PropertyLocationSection } from "@/components/PropertyLocationSection";
import { PropertyCTASection } from "@/components/PropertyCTASection";
import { PropertyDocuments } from "@/components/PropertyDocuments";
import { PropertyCard } from "@/components/PropertyCard";
import { ShareButtons } from "@/components/ShareButtons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PhoneLink } from "@/components/PhoneLink";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { ProjectViewTracker } from "@/components/ProjectViewTracker";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await projectService.getBySlug(slug);
  if (!project) return { title: "Project Not Found" };

  const description = project.shortDescription || project.description || `${project.name} — ${project.location}.`;
  const image = project.coverImage || project.images[0];

  return {
    title: project.name,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.name} | 5STAR.M Estate & Builders`,
      description: `${project.location} · ${description}`,
      url: `/projects/${project.slug}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: project.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([
    projectService.getBySlug(slug),
    settingsService.get().catch(() => null),
  ]);
  if (!project) notFound();

  const properties = await propertyService.listByProject(project.id);

  const whatsappNumber = project.whatsappNumber || settings?.whatsapp || site.whatsappNumber;
  const whatsappMessage = `Assalam-o-Alaikum 5STAR.M Estate & Builders,\n\nI am interested in the project: ${project.name} (${project.location}).\n\nPlease share complete details.\n\nThank you.`;
  const pageUrl = `${site.url}/projects/${project.slug}`;
  const heroImage = project.coverImage || project.images[0];

  return (
    <main className="bg-surface">
      <ProjectViewTracker projectId={project.id} />
      <div className="relative h-[42vh] min-h-[320px] w-full overflow-hidden sm:h-[52vh]">
        <Image
          src={heroImage}
          alt={project.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          unoptimized={heroImage?.startsWith("data:")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 lg:px-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
              {project.type}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-white sm:text-4xl">{project.name}</h1>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="h-4 w-4 text-primary" /> {project.location}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Projects", href: "/projects" },
            { label: project.name },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="space-y-8 lg:col-span-2">
            {project.shortDescription && (
              <p className="text-lg font-medium leading-relaxed text-ink">{project.shortDescription}</p>
            )}

            <div>
              <ShareButtons
                url={pageUrl}
                text={`Check out this project from 5STAR.M Estate & Builders:\n\n${project.name}\n${project.location}`}
              />
            </div>

            {project.description && (
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Overview</h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted">{project.description}</p>
              </div>
            )}

            {project.highlights.length > 0 && (
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Project Highlights</h2>
                <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {project.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(project.propertyTypes.length > 0 || project.paymentOptions.length > 0) && (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {project.propertyTypes.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                      <Building2 className="h-4.5 w-4.5 text-primary" /> Available Property Types
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {project.propertyTypes.map((t) => (
                        <li key={t} className="flex items-start gap-2 text-sm text-muted">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {project.paymentOptions.length > 0 && (
                  <div>
                    <h2 className="font-heading text-base font-bold text-ink">Payment Options</h2>
                    <ul className="mt-3 space-y-2">
                      {project.paymentOptions.map((o) => (
                        <li key={o} className="flex items-start gap-2 text-sm text-muted">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {project.images.length > 0 && (
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Gallery</h2>
                <div className="mt-3">
                  <MediaGallery images={project.images} title={project.name} />
                </div>
              </div>
            )}

            <PropertyDocuments documents={project.documents} title="Project Documents" />

            <PropertyLocationSection title="Project Location" location={project.location} mapsQuery={project.mapsUrl} />

            {properties.length > 0 && (
              <div>
                <h2 className="font-heading text-base font-bold text-ink">Available Properties</h2>
                <p className="mt-1 text-sm text-muted">Listings from within this project.</p>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {properties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-border bg-surface-muted p-6">
              <div className="flex items-center gap-2.5 text-sm font-bold text-ink">
                <User className="h-4.5 w-4.5 text-primary" /> Contact a Consultant
              </div>
              <p className="mt-1.5 text-sm text-muted">
                Speak with {site.director}, Director of {site.fullName}, for complete details on{" "}
                {project.name}.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <WhatsAppLink
                  href={whatsappUrlFor(whatsappNumber, whatsappMessage)}
                  context="project_detail_sidebar"
                  projectId={project.id}
                  className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Inquiry
                </WhatsAppLink>
                <PhoneLink
                  phoneHref={site.phoneHref}
                  context="project_detail_sidebar"
                  projectId={project.id}
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  <Phone className="h-4 w-4" /> Call Now
                </PhoneLink>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <PropertyCTASection
            whatsappHref={whatsappUrlFor(whatsappNumber, whatsappMessage)}
            callHref={`tel:${site.phoneHref}`}
            inquiryAnchor="/#contact"
          />
        </div>
      </div>
    </main>
  );
}
