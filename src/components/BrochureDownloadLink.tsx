"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { trackBrochureDownloadLeadAction } from "@/lib/actions/leads.actions";
import { trackEvent } from "@/lib/analytics";
import { ContactDialog } from "./ContactDialog";

/** A brochure download that first asks for the visitor's name and number,
 *  so the Brochure Request lead it creates in the CRM has real contact
 *  details, then opens the PDF. */
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
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  function proceed({ name, phone }: { name: string; phone: string }) {
    // Opened straight from the click so the browser's pop-up blocker allows it.
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
    void trackBrochureDownloadLeadAction({ name, phone, title, propertyId, projectId, projectTitle });
    trackEvent("brochure_download", { property_id: propertyId ?? "", project_id: projectId ?? "" });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <ContactDialog
        open={open}
        onClose={close}
        title="Download the brochure"
        description="Please share your name and number so our team can follow up with you about this listing."
        submitLabel="Download PDF"
        submitIcon={<Download className="h-4 w-4" />}
        submitClassName="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        onSubmit={proceed}
      />
    </>
  );
}
