import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";
import { customerService } from "@/services/customerService";
import { favoritesService } from "@/services/favoritesService";
import { leadService } from "@/services/leadService";
import { savedSearchService } from "@/services/savedSearchService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CustomerDisableToggle } from "@/components/admin/CustomerDisableToggle";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("customers");
  const { id } = await params;

  const customer = await customerService.getByIdForAdmin(id);
  if (!customer) notFound();

  const [favorites, inquiries, searches] = await Promise.all([
    favoritesService.listProperties(id),
    leadService.listByCustomer(id),
    savedSearchService.list(id),
  ]);

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-ink">{customer.fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary" /> {customer.email}</span>
            {customer.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary" /> {customer.phone}</span>}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              Registered {new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
        <CustomerDisableToggle id={customer.id} disabled={customer.disabled} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Saved Properties" value={customer.savedPropertiesCount} />
        <SummaryCard label="Inquiries" value={customer.inquiryCount} />
        <SummaryCard label="Saved Searches" value={searches.length} />
        <SummaryCard label="Status" value={customer.disabled ? "Disabled" : "Active"} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">Inquiries</h2>
          <div className="mt-3 space-y-2.5">
            {inquiries.length === 0 && <p className="py-6 text-center text-sm text-muted">No inquiries yet.</p>}
            {inquiries.map((l) => (
              <Link
                key={l.id}
                href={`/admin/leads/${l.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">{l.propertyTitle ?? "General inquiry"}</div>
                  <div className="text-xs text-muted">
                    {new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">Saved Properties</h2>
          <div className="mt-3 space-y-2.5">
            {favorites.length === 0 && <p className="py-6 text-center text-sm text-muted">No saved properties.</p>}
            {favorites.map((p) => (
              <Link
                key={p.id}
                href={`/admin/properties/${p.id}/edit`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/30"
              >
                <span className="truncate text-sm font-bold text-ink">{p.title}</span>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Saved Searches</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {searches.length === 0 && <p className="text-sm text-muted">No saved searches.</p>}
          {searches.map((s) => (
            <span key={s.id} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
              {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-xl font-extrabold text-ink">{value}</div>
    </div>
  );
}
