import Link from "next/link";
import Image from "next/image";
import { MapPin, ExternalLink } from "lucide-react";
import { propertyService } from "@/services/propertyService";

export const dynamic = "force-dynamic";

/** Read-only property browse for the Agent Mobile App (STEP 31, section
 *  15/16) — an agent recommends/shares properties with customers, but
 *  property CRUD stays admin-only (a sales_agent has no "properties"
 *  RBAC section). Reuses the same search service the public site and
 *  /admin/properties both already call. */
export default async function AgentPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const result = await propertyService.search({ q, page: page ? Number(page) : 1, pageSize: 20 });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Properties</h1>
      <p className="mt-1 text-sm text-muted">Browse the live catalog to recommend or share with a customer.</p>

      <form className="mt-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title, location..."
          className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          Search
        </button>
      </form>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.properties.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="relative aspect-[4/3] w-full">
              <Image src={p.images[0]} alt={p.title} fill sizes="(min-width:1024px) 300px, 90vw" className="object-cover" />
            </div>
            <div className="p-4">
              <p className="font-heading text-sm font-bold text-ink">{p.title}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {p.location}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-extrabold text-primary">{p.price}</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-ink">{p.status}</span>
              </div>
              <Link
                href={`/properties/${p.slug}`}
                target="_blank"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Public Page
              </Link>
            </div>
          </div>
        ))}
        {result.properties.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted">No properties match your search.</p>
        )}
      </div>

      {result.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-muted">
          Page {result.page} of {result.totalPages}
        </div>
      )}
    </div>
  );
}
