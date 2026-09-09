import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { customerService } from "@/services/customerService";
import { leadService } from "@/services/leadService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateOnly } from "@/lib/date";

export const metadata = { title: "Inquiry Details" };
export const dynamic = "force-dynamic";

export default async function CustomerInquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const lead = await leadService.getById(id);
  // RLS already means a lead belonging to someone else can never come
  // back here, but confirm the ownership explicitly too.
  if (!lead || lead.customerId !== customer.id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/customer/inquiries" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Inquiries
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-extrabold text-ink">{lead.propertyTitle ?? "General Inquiry"}</h1>
            <p className="mt-1 text-sm text-muted">
              Submitted {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <StatusBadge status={lead.status} />
        </div>

        <div className="mt-5 rounded-xl bg-surface-muted p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your Message</div>
          <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{lead.message}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current Status</div>
            <div className="mt-1 font-semibold text-ink">{lead.status}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Last Updated</div>
            <div className="mt-1 font-semibold text-ink">
              {new Date(lead.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {lead.nextFollowUpDate && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
            <CalendarClock className="h-4.5 w-4.5" />
            Follow-up scheduled for {formatDateOnly(lead.nextFollowUpDate)}
            {lead.nextFollowUpTime && ` at ${lead.nextFollowUpTime.slice(0, 5)}`}
          </div>
        )}
      </div>
    </div>
  );
}
