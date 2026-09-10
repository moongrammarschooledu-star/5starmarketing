"use client";

import type { ReactNode } from "react";
import { trackBrochureDownloadLeadAction } from "@/lib/actions/leads.actions";
import { trackEvent } from "@/lib/analytics";

/** Wraps a brochure download link so the click shows up as a real
 *  Brochure Request lead in the CRM — never blocks the actual download. */
export function BrochureDownloadLink({
  href,
  title,
  propertyId,
  projectId,
  projectTitle,
  className,
  children,
}: {
  href: string;
  title?: string;
  propertyId?: string;
  projectId?: string;
  projectTitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackBrochureDownloadLeadAction(title, propertyId, projectId, projectTitle);
        trackEvent("brochure_download", { property_id: propertyId ?? "", project_id: projectId ?? "" });
      }}
      className={className}
    >
      {children}
    </a>
  );
}
