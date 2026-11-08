import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { ProjectsBrowser } from "@/components/ProjectsBrowser";
import { projectService } from "@/services/projectService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 180;

const pageTitle = "Real Estate Projects in Lahore | 5STAR.M Estate & Builders";
const pageDescription =
  "Explore real estate and development projects in Lahore by 5STAR.M Estate & Builders. View project details and discover property opportunities with our team.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/projects" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/projects",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof projectService.listPublished>> = [];
  let loadError = !isSupabaseConfigured();

  if (!loadError) {
    try {
      projects = await projectService.listPublished();
    } catch {
      loadError = true;
    }
  }

  const collectionJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Real Estate Projects in Lahore",
    description: pageDescription,
    url: `${site.url}/projects`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: project.name,
        url: `${site.url}/projects/${project.slug}`,
      })),
    },
  };

  return (
    <main className="bg-surface-muted">
      {!loadError && <JsonLd data={collectionJsonLd} />}
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-8 bg-current" />
            Our Portfolio
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Real Estate Projects in Lahore
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Explore property opportunities and development projects from 5STAR.M Estate &amp;
            Builders.
          </p>
        </div>

        <div className="mt-10">
          {loadError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <FolderKanban className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-ink">Projects are temporarily unavailable</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                We couldn&apos;t load projects right now — please check back shortly, or contact us
                directly on WhatsApp.
              </p>
            </div>
          ) : (
            <ProjectsBrowser projects={projects} />
          )}
        </div>
      </div>
    </main>
  );
}
