import Link from "next/link";
import { PlusCircle, Ticket, AlertTriangle, HelpCircle } from "lucide-react";
import { customerService } from "@/services/customerService";
import { ticketService } from "@/services/ticketService";
import { supportSettingsService } from "@/services/supportSettingsService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Support" };
export const dynamic = "force-dynamic";

export default async function CustomerSupportPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const [tickets, settings] = await Promise.all([ticketService.listForCustomer(customer.id), supportSettingsService.get()]);
  const open = tickets.filter((t) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(t.status));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Support</h1>
      <p className="mt-1 text-sm text-muted">{settings.disclaimerText}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/customer/support/new" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
          <PlusCircle className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-ink">Create Support Ticket</span>
        </Link>
        <Link href="/customer/support/complaints" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-ink">Submit Complaint</span>
        </Link>
        <Link href="/customer/support/faq" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
          <HelpCircle className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-ink">Browse FAQ</span>
        </Link>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-ink">My Tickets</h2>
          <Link href="/customer/support/tickets" className="text-xs font-bold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {open.slice(0, 5).map((t) => (
            <Link key={t.id} href={`/customer/support/tickets/${t.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4 hover:border-primary">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold text-ink">
                  {t.ticketNumber} — {t.subject}
                </span>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
          {open.length === 0 && <p className="text-sm text-muted">No open tickets.</p>}
        </div>
      </div>
    </div>
  );
}
