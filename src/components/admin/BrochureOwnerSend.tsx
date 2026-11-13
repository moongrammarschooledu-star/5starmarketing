"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { site } from "@/lib/site";
import { logBrochureSentToOwnerAction } from "@/lib/actions/brochure.actions";
import { BROCHURE_OWNER_PRESETS, OwnerMessageModal, type OwnerInfo } from "./OwnerMessageModal";

export interface BrochureForOwner {
  id: string;
  title: string;
  slug: string;
  type: "property" | "project";
  targetName: string;
  generatedFile?: string;
  public: boolean;
  propertyId?: string;
  projectId?: string;
}

/** The brochure's PDF if there is one, otherwise its public page, otherwise nothing yet. */
export function brochureLink(b: Pick<BrochureForOwner, "generatedFile" | "public" | "slug">): string | null {
  if (b.generatedFile) return b.generatedFile;
  if (b.public) return `${site.url}/brochure/${b.slug}`;
  return null;
}

/** A WhatsApp button that opens a ready message to the owner of the
 *  property/project this brochure is for, with the brochure link in it. */
export function BrochureOwnerSend({
  brochure,
  owner,
  loadFailed = false,
  variant,
}: {
  brochure: BrochureForOwner;
  owner?: OwnerInfo;
  loadFailed?: boolean;
  variant: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);
  const hasNumber = Boolean(owner?.phone?.trim() || owner?.altPhone?.trim());
  const link = brochureLink(brochure);
  const what = brochure.type === "property" ? "Property" : "Project";
  const editHref = brochure.type === "property" ? `/admin/properties/${brochure.propertyId}/edit` : `/admin/projects/${brochure.projectId}/edit`;

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={hasNumber ? "Send the brochure to the owner on WhatsApp" : "No owner number saved"}
        aria-label="Send the brochure to the owner on WhatsApp"
        className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
          hasNumber ? "border-success/40 text-success hover:bg-success/10" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
        }`}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold ${
          hasNumber ? "bg-success text-white hover:opacity-90" : "border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
        }`}
      >
        <MessageCircle className="h-3.5 w-3.5" /> Send to owner on WhatsApp
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <OwnerMessageModal
          title={`${brochure.title} - ${brochure.targetName}`}
          detailLines={[`${what}: ${brochure.targetName}`, ...(link ? [`Brochure: ${link}`] : [])]}
          presets={BROCHURE_OWNER_PRESETS}
          owner={owner}
          loadFailed={loadFailed}
          editHref={editHref}
          blockedReason={link ? undefined : "This brochure has no PDF yet and is not public. Press Generate PDF first, then send it to the owner."}
          onSent={(channel) => void logBrochureSentToOwnerAction(brochure.id, channel)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
