import Link from "next/link";
import { propertyService } from "@/services/propertyService";
import { legalPropertyService } from "@/services/legalPropertyService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LegalPropertiesPage() {
  await requireSection("legal");
  const [properties, records] = await Promise.all([propertyService.list(), legalPropertyService.list()]);
  const recordByProperty = new Map(records.map((r) => [r.propertyId, r]));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Properties</h1>
      <p className="mt-1 text-sm text-muted">Open any property to manage its ownership, documents, due diligence, compliance, encumbrances and risks.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Legal Officer</th>
              <th className="px-4 py-3">Legal Record</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => {
              const record = recordByProperty.get(p.id);
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-4 py-3 font-semibold text-ink">{p.title}</td>
                  <td className="px-4 py-3 text-muted">{record?.legalOfficerName ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-muted">{record ? "Created" : "Not started"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/legal/properties/${p.id}`} className="text-sm font-bold text-primary hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
            {properties.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No properties yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
