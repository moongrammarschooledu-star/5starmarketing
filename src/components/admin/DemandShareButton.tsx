"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { whatsappUrlFor, site } from "@/lib/site";
import { markDemandSharedAction } from "@/lib/actions/demands.actions";

/** Opens WhatsApp to the client with this property's details and public
 *  link already written, and remembers that it was sent. The owner's private
 *  details are never part of the message. */
export function DemandShareButton({
  demandId,
  clientName,
  clientNumber,
  alreadyShared,
  property,
}: {
  demandId: string;
  clientName: string;
  clientNumber: string;
  alreadyShared: boolean;
  property: { id: string; slug: string; title: string; location: string; size: string; price: string };
}) {
  const [shared, setShared] = useState(alreadyShared);

  const message = [
    `Assalam-o-Alaikum ${clientName},`,
    "",
    "We have a property that matches what you are looking for:",
    "",
    property.title,
    `Location: ${property.location}`,
    `Size: ${property.size}`,
    `Price: ${property.price}`,
    "",
    `Details and photos: ${site.url}/properties/${property.slug}`,
    "",
    `${site.fullName} - ${site.phoneDisplay}`,
  ].join("\n");

  return (
    <a
      href={whatsappUrlFor(clientNumber, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        setShared(true);
        void markDemandSharedAction(demandId, property.id);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
        shared ? "border border-success/40 text-success hover:bg-success/5" : "bg-success text-white hover:opacity-90"
      }`}
    >
      {shared ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
      {shared ? "Sent - send again" : "Send on WhatsApp"}
    </a>
  );
}
