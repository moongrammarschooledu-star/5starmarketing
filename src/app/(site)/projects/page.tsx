import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { ProjectsBrowser } from "@/components/ProjectsBrowser";
import { projectService } from "@/services/projectService";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore property opportunities and development projects from 5STAR.M Estate & Builders in Lahore.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects | 5STAR.M Estate & Builders",
    description:
      "Explore property opportunities and development projects from 5STAR.M Estate & Builders in Lahore.",
    url: "/projects",
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

  return (
    <main className="bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-8 bg-current" />
            Our Portfolio
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Explore Our Projects
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Discover property opportunities and development projects from 5STAR.M Estate &amp;
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
