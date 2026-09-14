import Link from "next/link";
import { customerService } from "@/services/customerService";
import { ticketService } from "@/services/ticketService";
import { complaintService } from "@/services/complaintService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewTicketForm } from "@/components/support/NewTicketForm";

export const metadata = { title: "Complaints" };
export const dynamic = "force-dynamic";

export default async function CustomerComplaintsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const tickets = await ticketService.listForCustomer(customer.id);
  const complaintTickets = tickets.filter((t) => t.categoryCode === "COMPLAINT");
  const complaints = await Promise.all(complaintTickets.map((t) => complaintService.getByTicketId(t.id)));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Complaints</h1>
      <p className="mt-1 text-sm text-muted">Filing a complaint opens a dedicated ticket that our team investigates.</p>

      <details className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold text-ink">+ Submit a New Complaint</summary>
        <div className="mt-3">
          <NewTicketForm categories={[]} mode="customer" isComplaint />
        </div>
      </details>

      <div className="mt-6 space-y-2">
        {complaintTickets.map((t, i) => {
          const complaint = complaints[i];
          return (
            <Link key={t.id} href={`/customer/support/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
              <div>
                <p className="text-sm font-bold text-ink">
                  {complaint?.complaintNumber ?? t.ticketNumber} — {t.subject}
                </p>
              </div>
              <StatusBadge status={complaint?.status ?? t.status} />
            </Link>
          );
        })}
        {complaintTickets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No complaints filed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
