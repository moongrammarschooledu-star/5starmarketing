import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { customerService } from "@/services/customerService";
import { requireSection } from "@/lib/guard";
import { CustomerDisableToggle } from "@/components/admin/CustomerDisableToggle";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireSection("customers");

  let customers: Awaited<ReturnType<typeof customerService.listAll>> = [];
  let loadError: string | null = null;
  try {
    customers = await customerService.listAll();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load customers.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Customers</h1>
      <p className="mt-1 text-sm text-muted">Everyone who has created a customer account on the website.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Saved</th>
              <th className="px-4 py-3">Inquiries</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  No customers have registered yet.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${c.id}`} className="font-semibold text-ink hover:text-primary">
                    {c.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{c.email}</td>
                <td className="px-4 py-3 text-muted">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-muted">{c.savedPropertiesCount}</td>
                <td className="px-4 py-3 text-muted">{c.inquiryCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      c.disabled ? "bg-muted/20 text-muted" : "bg-success/10 text-success"
                    }`}
                  >
                    {c.disabled ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <CustomerDisableToggle id={c.id} disabled={c.disabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 lg:hidden">
        {customers.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
            No customers have registered yet.
          </p>
        )}
        {customers.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <Link href={`/admin/customers/${c.id}`} className="font-bold text-ink hover:text-primary">
                {c.fullName}
              </Link>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  c.disabled ? "bg-muted/20 text-muted" : "bg-success/10 text-success"
                }`}
              >
                {c.disabled ? "Disabled" : "Active"}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">{c.email}</div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span>{c.savedPropertiesCount} saved</span>
              <span>{c.inquiryCount} inquiries</span>
            </div>
            <div className="mt-3">
              <CustomerDisableToggle id={c.id} disabled={c.disabled} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
