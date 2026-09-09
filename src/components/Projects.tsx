import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { projectService } from "@/services/projectService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import clsx from "clsx";

const statusStyle: Record<string, string> = {
  Completed: "bg-success/10 text-success",
  Ongoing: "bg-primary/10 text-primary",
  Upcoming: "bg-ink/10 text-ink",
};

export async function Projects() {
  let projects: Awaited<ReturnType<typeof projectService.listPublished>> = [];
  if (isSupabaseConfigured()) {
    try {
      projects = await projectService.listPublished();
    } catch (e) {
      console.error("Projects: failed to load projects:", e);
    }
  }

  if (projects.length === 0) return null;

  return (
    <section id="projects" className="bg-surface-muted py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow="Our Portfolio"
          title="Featured"
          highlight="Projects"
          description="A look at the kind of residential and commercial developments 5STAR.M is associated with. Updated regularly as new projects launch."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {projects.slice(0, 4).map((project) => {
            const cover = project.coverImage || project.images[0];
            return (
              <article
                key={project.id}
                className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/10"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={cover}
                    alt={project.name}
                    fill
                    sizes="(min-width: 1024px) 300px, 90vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized={cover?.startsWith("data:")}
                  />
                  <span
                    className={clsx(
                      "absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold",
                      statusStyle[project.status]
                    )}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-sm font-bold text-ink">{project.name}</h3>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {project.location} &middot; {project.type}
                  </div>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary"
                  >
                    View Project <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            View All Projects <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
