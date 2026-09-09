import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { customerService } from "@/services/customerService";
import { leadService } from "@/services/leadService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "My Inquiries" };
export const dynamic = "force-dynamic";

export default async function CustomerInquiriesPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const inquiries = await leadService.listByCustomer(customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Inquiries</h1>
      <p className="mt-1 text-sm text-muted">Every property inquiry you&apos;ve submitted while logged in.</p>

      {inquiries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">
            You haven&apos;t submitted any property inquiries yet.
          </h2>
          <Link
            href="/properties"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Explore Properties
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {inquiries.map((l) => (
            <Link
              key={l.id}
              href={`/customer/inquiries/${l.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30"
            >
              <div className="min-w-0">
                <div className="truncate font-bold text-ink">{l.propertyTitle ?? "General inquiry"}</div>
                <p className="mt-1 line-clamp-1 text-sm text-muted">{l.message}</p>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              <StatusBadge status={l.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
