import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { site } from "@/lib/site";
import { JsonLd } from "./JsonLd";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Visual breadcrumb trail plus a matching BreadcrumbList JSON-LD block.
 *  The final item is rendered as plain text (the current page), never a
 *  link, matching standard breadcrumb UX and schema.org guidance. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const all: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: item.href ? `${site.url}${item.href === "/" ? "" : item.href}` : undefined,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {all.map((item, i) => {
          const isLast = i === all.length - 1;
          return (
            <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i === 0 ? (
                <Link href={item.href ?? "/"} className="flex items-center gap-1 hover:text-primary">
                  <Home className="h-3.5 w-3.5" /> {item.label}
                </Link>
              ) : isLast || !item.href ? (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-primary">
                  {item.label}
                </Link>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </span>
          );
        })}
      </nav>
    </>
  );
}
