import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  invoice_number: string;
  due_date: string;
  total_due: number;
  status: string;
  leases: { lease_number: string; tenants: { name: string } | null; rental_properties: { properties: { title: string } | null } | null } | null;
};

export default async function RentCollectionPage() {
  await requireSection("rentals");
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data } = await supabase
    .from("rent_schedules")
    .select("id, invoice_number, due_date, total_due, status, leases(lease_number, tenants(name), rental_properties(properties(title)))")
    .not("status", "in", "(CANCELLED)")
    .order("due_date", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[] as Row[];

  const dueToday = rows.filter((r) => r.due_date === today && r.status !== "PAID");
  const dueThisWeek = rows.filter((r) => r.due_date > today && r.due_date <= weekEnd.toISOString().slice(0, 10) && r.status !== "PAID");
  const overdue = rows.filter((r) => r.status === "OVERDUE");
  const partiallyPaid = rows.filter((r) => r.status === "PARTIALLY_PAID");
  const upcoming = rows.filter((r) => r.due_date > weekEnd.toISOString().slice(0, 10) && r.status === "UPCOMING");
  const paid = rows.filter((r) => r.status === "PAID");

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rent Collection</h1>

      <Section title="Due Today" rows={dueToday} />
      <Section title="Due This Week" rows={dueThisWeek} />
      <Section title="Overdue" rows={overdue} accent />
      <Section title="Partially Paid" rows={partiallyPaid} />
      <Section title="Upcoming" rows={upcoming} />
      <Section title="Paid" rows={paid} />
    </div>
  );
}

function Section({ title, rows, accent }: { title: string; rows: Row[]; accent?: boolean }) {
  return (
    <div className="mt-6">
      <h2 className={`font-heading text-lg font-bold ${accent ? "text-primary" : "text-ink"}`}>
        {title} <span className="text-sm font-normal text-muted">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Lease</th>
                <th className="px-4 py-2.5">Tenant</th>
                <th className="px-4 py-2.5">Property</th>
                <th className="px-4 py-2.5">Due Date</th>
                <th className="px-4 py-2.5">Total Due</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-ink">{r.invoice_number}</td>
                  <td className="px-4 py-2.5 text-muted">{r.leases?.lease_number ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{r.leases?.tenants?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{r.leases?.rental_properties?.properties?.title ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{new Date(r.due_date).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-2.5 font-semibold text-ink">{formatPKR(r.total_due)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
