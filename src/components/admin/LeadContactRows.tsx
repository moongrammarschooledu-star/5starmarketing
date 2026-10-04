import { MessageCircle, Phone } from "lucide-react";
import type { Lead } from "@/lib/models/lead";
import { whatsappUrlFor } from "@/lib/site";

const PHONE_LIKE = /\d{7,}/;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{children}</span>
    </div>
  );
}

/** Name / phone / WhatsApp / email rows for the lead "Customer Information"
 *  card. Numbers are tap-to-call and tap-to-WhatsApp. Older leads created
 *  before contact details were collected carry a placeholder instead of a
 *  number - those are shown as "Not provided" rather than as a fake number. */
export function LeadContactRows({ lead }: { lead: Lead }) {
  const phoneOk = PHONE_LIKE.test(lead.phone);
  const waNumber = lead.whatsapp && PHONE_LIKE.test(lead.whatsapp) ? lead.whatsapp : phoneOk ? lead.phone : null;

  return (
    <>
      <Row label="Name">{lead.name}</Row>
      <Row label="Phone">
        {phoneOk ? (
          <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <Phone className="h-3.5 w-3.5" /> {lead.phone}
          </a>
        ) : (
          <span className="font-normal text-muted" title={lead.phone}>
            Not provided
          </span>
        )}
      </Row>
      {waNumber && (
        <Row label="WhatsApp">
          <a href={whatsappUrlFor(waNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-success hover:underline">
            <MessageCircle className="h-3.5 w-3.5" /> {waNumber}
          </a>
        </Row>
      )}
      {lead.email && (
        <Row label="Email">
          <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
            {lead.email}
          </a>
        </Row>
      )}
      {lead.preferredContactMethod && <Row label="Prefers">{lead.preferredContactMethod}</Row>}
      {lead.preferredContactTime && <Row label="Best Time">{lead.preferredContactTime}</Row>}
    </>
  );
}
