import Link from "next/link";
import clsx from "clsx";
import { purposes, type Purpose } from "@/lib/models/property";
import { PURPOSE_SLUG } from "@/lib/propertyPurpose";

const LABEL: Record<Purpose, string> = {
  "For Sale": "For Sale",
  "For Rent": "For Rent",
  Investment: "Investment",
};

/** The big "For Sale | For Rent" switch at the top of the public property pages.
 *  Each tab is a plain link, and picking one starts a fresh search (sale and
 *  rent prices are very different, so old price filters are not carried over). */
export function PurposeTabs({ active }: { active?: Purpose }) {
  const items: { key: string; label: string; href: string; on: boolean }[] = [
    { key: "all", label: "All Properties", href: "/properties", on: !active },
    ...purposes.map((p) => ({ key: p, label: LABEL[p], href: `/properties?purpose=${PURPOSE_SLUG[p]}`, on: active === p })),
  ];
  return (
    <nav aria-label="Property type of listing" className="mt-6 flex flex-wrap gap-2">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.on ? "page" : undefined}
          className={clsx(
            "rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors",
            t.on ? "border-primary bg-primary text-primary-foreground" : "border-ink/15 bg-surface text-ink hover:border-primary hover:text-primary",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
