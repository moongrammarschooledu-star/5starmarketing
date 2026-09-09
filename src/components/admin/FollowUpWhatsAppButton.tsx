"use client";

import { MessageCircle } from "lucide-react";
import { whatsappUrlFor } from "@/lib/site";
import { logWhatsAppActivityAction } from "@/lib/actions/whatsapp.actions";

export function FollowUpWhatsAppButton({
  leadId,
  name,
  phone,
  whatsapp,
  propertyTitle,
}: {
  leadId: string;
  name: string;
  phone: string;
  whatsapp?: string;
  propertyTitle?: string;
}) {
  const number = (whatsapp || phone || "").replace(/[^0-9+]/g, "");
  const message = `Assalam-o-Alaikum ${name},\n\nThis is a quick follow-up regarding ${
    propertyTitle ?? "your inquiry"
  } with 5STAR.M Estate & Builders. Are you still interested? Please let us know if you need any further details.\n\nThank you.`;

  return (
    <a
      href={whatsappUrlFor(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logWhatsAppActivityAction(leadId, "WhatsApp Opened", "Follow-Up")}
      title="WhatsApp Follow-Up"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success hover:bg-success/20"
      style={{ pointerEvents: number ? "auto" : "none", opacity: number ? 1 : 0.4 }}
    >
      <MessageCircle className="h-3.5 w-3.5" />
    </a>
  );
}
