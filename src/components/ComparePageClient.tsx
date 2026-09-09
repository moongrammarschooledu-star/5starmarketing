"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Scale, X, MessageCircle, ArrowLeft } from "lucide-react";
import type { Property } from "@/lib/models/property";
import { whatsappLink } from "@/lib/site";
import { useCompare } from "@/components/customer/CompareProvider";
import { getComparePropertiesAction } from "@/lib/actions/compare.actions";

const ROWS: { label: string; render: (p: Property) => string }[] = [
  { label: "Type", render: (p) => p.type },
  { label: "Purpose", render: (p) => p.purpose },
  { label: "Location", render: (p) => p.location },
  { label: "Size", render: (p) => p.size },
  { label: "Price", render: (p) => p.price },
  { label: "Payment Option", render: (p) => p.paymentOption },
  { label: "Status", render: (p) => p.status },
];

export function ComparePageClient() {
  const { ids, toggle } = useCompare();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getComparePropertiesAction(ids).then((result) => {
      // Preserve selection order.
      const byId = new Map(result.map((p) => [p.id, p]));
      setProperties(ids.map((id) => byId.get(id)).filter((p): p is Property => !!p));
      setLoading(false);
    });
  }, [ids]);

  if (loading) {
    return <div className="py-24 text-center text-sm text-muted">Loading comparison...</div>;
  }

  if (properties.length === 0) {
    return (
      <div className="py-24 text-center">
        <Scale className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-heading text-xl font-bold text-ink">No properties selected to compare</h1>
        <p className="mt-2 text-sm text-muted">
          Browse properties and tap &quot;Compare&quot; on up to 4 listings to see them side-by-side.
        </p>
        <Link
          href="/properties"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" /> Browse Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Compare Properties</h1>
      <p className="mt-1 text-sm text-muted">Comparing {properties.length} of up to 4 properties, side-by-side.</p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-border p-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground" />
              {properties.map((p) => (
                <th key={p.id} className="border-b border-border p-3 text-left align-top">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      aria-label="Remove from comparison"
                      className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
                    >
                      <X className="h-3.5 w-3.5 text-ink" />
                    </button>
                    <div className="relative aspect-[4/3] w-full max-w-[220px] overflow-hidden rounded-xl">
                      <Image src={p.images[0]} alt={p.title} fill sizes="220px" className="object-cover" unoptimized={p.images[0]?.startsWith("data:")} />
                    </div>
                    <div className="mt-2 max-w-[220px] font-heading text-sm font-bold text-ink">{p.title}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border">
                <td className="p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{row.label}</td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3 text-ink">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-border">
              <td className="p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Features</td>
              {properties.map((p) => (
                <td key={p.id} className="max-w-[220px] p-3 text-xs text-muted">
                  {p.features.length > 0 ? p.features.join(", ") : "—"}
                </td>
              ))}
            </tr>
            <tr className="border-b border-border">
              <td className="p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Amenities</td>
              {properties.map((p) => (
                <td key={p.id} className="max-w-[220px] p-3 text-xs text-muted">
                  {p.amenities.length > 0 ? p.amenities.join(", ") : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3" />
              {properties.map((p) => (
                <td key={p.id} className="p-3">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/properties/${p.slug}`}
                      className="flex items-center justify-center rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
                    >
                      View Details
                    </Link>
                    <a
                      href={whatsappLink(
                        `Assalam-o-Alaikum 5STAR.M Estate & Builders,\n\nI am interested in:\n\nProperty: ${p.title}\nLocation: ${p.location}\n\nPlease share complete details.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2 text-xs font-bold text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
