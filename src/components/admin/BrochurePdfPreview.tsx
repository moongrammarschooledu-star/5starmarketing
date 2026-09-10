"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { BrochureDocument } from "@/lib/pdf/BrochureDocument";
import type { BrochureType, BrochureSectionKey } from "@/lib/models/brochure";

// PDFViewer renders the exact same document tree used for the real PDF
// (server-side, via renderToBuffer) live in an iframe — so this preview
// is not an approximation, it IS the brochure, just not saved yet.
export function BrochurePdfPreview(props: {
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
  return (
    <PDFViewer style={{ width: "100%", height: "80vh", border: "none", borderRadius: 12 }} showToolbar>
      <BrochureDocument {...props} />
    </PDFViewer>
  );
}
