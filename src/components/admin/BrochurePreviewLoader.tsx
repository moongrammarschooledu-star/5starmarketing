"use client";

import dynamic from "next/dynamic";
import type { BrochureType, BrochureSectionKey } from "@/lib/models/brochure";

// PDFViewer needs the browser (canvas rendering) — no server-side
// render. `ssr: false` is only allowed inside a Client Component, hence
// this thin wrapper around the dynamic import.
const BrochurePdfPreview = dynamic(
  () => import("@/components/admin/BrochurePdfPreview").then((m) => m.BrochurePdfPreview),
  { ssr: false, loading: () => <div className="flex h-[80vh] items-center justify-center text-sm text-muted">Loading preview...</div> }
);

export function BrochurePreviewLoader(props: {
  type: BrochureType;
  sections: BrochureSectionKey[];
  business: { name: string; address: string; phone: string; email: string; whatsappUrl: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paymentPlan?: any;
  qrCodes: { propertyUrl?: string; whatsapp?: string; maps?: string };
  badge?: string;
}) {
  return <BrochurePdfPreview {...props} />;
}
