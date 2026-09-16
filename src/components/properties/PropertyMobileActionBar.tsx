import Link from "next/link";
import { MessageCircle, CalendarClock } from "lucide-react";
import { PhoneLink } from "@/components/PhoneLink";

/** Sticky mobile-only bottom action bar (STEP 31 section 9) — the
 *  desktop sidebar already has these same actions; this just makes them
 *  reachable without scrolling on a phone. Hidden at lg and above. */
export function PropertyMobileActionBar({
  whatsappHref,
  bookVisitHref,
  phoneHref,
}: {
  whatsappHref: string;
  bookVisitHref: string;
  phoneHref: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-2 border-t border-border bg-surface p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 py-3 text-xs font-bold text-white"
      >
        <MessageCircle className="h-4 w-4" /> Contact Agent
      </a>
      <PhoneLink
        phoneHref={phoneHref}
        context="property_detail_mobile_bar"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-3 text-xs font-bold text-ink"
      >
        Call
      </PhoneLink>
      <Link
        href={bookVisitHref}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-3 text-xs font-bold text-primary-foreground"
      >
        <CalendarClock className="h-4 w-4" /> Visit
      </Link>
    </div>
  );
}
