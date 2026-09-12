import Link from "next/link";
import { receivableService } from "@/services/receivableService";
import { ReceivablesTable } from "@/components/admin/accounting/ReceivablesTable";
import { receivableStatuses } from "@/lib/models/accounting";
import type { ReceivableStatus } from "@/lib/models/accounting";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSection("accounting");
  const sp = await searchParams;
  const status = sp.status && receivableStatuses.includes(sp.status as ReceivableStatus) ? (sp.status as ReceivableStatus) : undefined;
  const receivables = await receivableService.list({ status });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Receivables</h1>
      <p className="mt-1 text-sm text-muted">Every deal with an outstanding balance — computed live from real payments, never a second stored copy.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/accounting/receivables" className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${!status ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"}`}>
          All
        </Link>
        {receivableStatuses.map((s) => (
          <Link key={s} href={`/admin/accounting/receivables?status=${s}`} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${status === s ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"}`}>
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <ReceivablesTable receivables={receivables} />
      </div>
    </div>
  );
}
