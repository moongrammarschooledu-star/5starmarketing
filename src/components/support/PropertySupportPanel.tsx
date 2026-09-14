import Link from "next/link";
import { Headset } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/** Support Tickets &amp; Complaints Tab — admin-only, mirrors
 *  PropertyMaintenancePanel/PropertyLegalPanel exactly. This is this
 *  codebase's implementation of the spec's /properties/[id]/support
 *  and /properties/[id]/complaints routes — kept admin-side (not
 *  public), since ticket/complaint content is private customer data,
 *  following the same precedent STEP 25/28 established. */
export async function PropertySupportPanel({ propertyId }: { propertyId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select("id, status, category_code").eq("property_id", propertyId);
  const tickets = data ?? [];
  const open = tickets.filter((t) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(t.status));
  const complaints = tickets.filter((t) => t.category_code === "COMPLAINT");

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Headset className="h-3.5 w-3.5" /> Support Tickets &amp; Complaints (admin-only — never shown publicly)
        </h2>
        <Link href={`/admin/support/tickets?propertyId=${propertyId}`} className="text-xs font-bold text-primary hover:underline">
          Manage
        </Link>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Tickets" value={String(tickets.length)} />
        <Stat label="Open" value={String(open.length)} accent={open.length > 0} />
        <Stat label="Complaints" value={String(complaints.length)} accent={complaints.length > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-heading text-sm font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
