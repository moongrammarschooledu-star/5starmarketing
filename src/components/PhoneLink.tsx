"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

/** A `tel:` link that fires a `phone_click` analytics event — a small
 *  client wrapper so the Server Component pages that use it don't need
 *  to become client components themselves. */
export function PhoneLink({
  phoneHref,
  context,
  className,
  children,
}: {
  phoneHref: string;
  context: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={`tel:${phoneHref}`} onClick={() => trackEvent("phone_click", { context })} className={className}>
      {children}
    </a>
  );
}
