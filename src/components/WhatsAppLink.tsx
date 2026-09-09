"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

/** A WhatsApp link that fires a `whatsapp_click` analytics event — a
 *  small client wrapper so the Server Component pages that use it don't
 *  need to become client components themselves. */
export function WhatsAppLink({
  href,
  context,
  className,
  children,
}: {
  href: string;
  context: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click", { context })}
      className={className}
    >
      {children}
    </a>
  );
}
