import { MessageCircle, Phone } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { PhoneLink } from "@/components/PhoneLink";

/** Two big buttons for ad visitors on a phone: chat on WhatsApp or call, one tap,
 *  no form. `sticky` pins them to the bottom of the screen. */
export function LandingContactButtons({ message, context, sticky = false }: { message: string; context: string; sticky?: boolean }) {
  const wa = (
    <WhatsAppLink
      href={whatsappLink(message)}
      context={context}
      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-success px-4 py-3.5 text-sm font-bold text-white shadow-md"
    >
      <MessageCircle className="h-5 w-5" fill="white" strokeWidth={0} /> WhatsApp par baat karein
    </WhatsAppLink>
  );
  const call = (
    <PhoneLink
      phoneHref={site.phoneHref}
      context={context}
      className="flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-surface px-5 py-3.5 text-sm font-bold text-primary"
    >
      <Phone className="h-5 w-5" /> Call
    </PhoneLink>
  );
  if (!sticky) return <div className="flex gap-3">{wa}{call}</div>;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      {wa}
      {call}
    </div>
  );
}
