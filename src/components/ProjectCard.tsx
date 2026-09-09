"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Building2, MessageCircle } from "lucide-react";
import type { Project } from "@/lib/models/project";
import { whatsappLink } from "@/lib/site";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";

export function ProjectCard({ project }: { project: Project }) {
  const cover = project.coverImage || project.images[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/10">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={cover}
          alt={`${project.name} — ${project.type} project in ${project.location}`}
          fill
          sizes="(min-width: 1024px) 380px, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={cover?.startsWith("data:")}
        />
        <span className="absolute left-3 top-3">
          <StatusBadge status={project.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-lg font-bold text-ink">{project.name}</h3>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          {project.location}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Building2 className="h-4 w-4 shrink-0 text-primary" />
          {project.type}
        </div>

        {project.shortDescription && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{project.shortDescription}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-border pt-4">
          <Link
            href={`/projects/${project.slug}`}
            className="flex items-center justify-center rounded-full border-2 border-ink/15 px-3 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            View Project
          </Link>
          <a
            href={whatsappLink(
              `Assalam-o-Alaikum 5STAR.M Estate & Builders,\n\nI am interested in the project: ${project.name} (${project.location}).\n\nPlease share complete details.\n\nThank you.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackEvent("whatsapp_click", { context: "project_card", project_id: project.id });
              recordWebsiteEventAction("whatsapp_click", { projectId: project.id, sessionId: getOrCreateSessionId() });
            }}
            className="flex items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2.5 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Inquiry
          </a>
        </div>
      </div>
    </article>
  );
}
