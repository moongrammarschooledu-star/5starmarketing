import Link from "next/link";
import { customerService } from "@/services/customerService";
import { ticketService } from "@/services/ticketService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "My Tickets" };
export const dynamic = "force-dynamic";

export default async function CustomerTicketsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;
  const tickets = await ticketService.listForCustomer(customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Tickets</h1>

      <div className="mt-6 space-y-2">
        {tickets.map((t) => (
          <Link key={t.id} href={`/customer/support/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <div>
              <p className="text-sm font-bold text-ink">
                {t.ticketNumber} — {t.subject}
              </p>
              <p className="text-xs text-muted">{t.categoryLabel ?? t.categoryCode}</p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        ))}
        {tickets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No tickets yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
