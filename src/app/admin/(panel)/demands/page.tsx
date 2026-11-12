import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck, PlusCircle, Sparkles, Handshake, XCircle } from "lucide-react";
import { demandService } from "@/services/demandService";
import { requireSection } from "@/lib/guard";
import { StatCard } from "@/components/admin/StatCard";
import { propertyService } from "@/services/propertyService";
import { DemandContactsTable, type ContactRow, type ShareableProperty } from "@/components/admin/DemandContactsTable";
import { describeBudget, describeSize } from "@/lib/demandText";
import { formatDateOnlyShort } from "@/lib/date";
import { demandStatuses, type DemandStatus, type PropertyDemand } from "@/lib/models/demand";

export const metadata: Metadata = { title: "Customer Contacts" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<DemandStatus, string> = {
  Open: "bg-primary/10 text-primary",
  Matched: "bg-success/10 text-success",
  Closed: "bg-ink/10 text-ink",
  Lost: "bg-muted/20 text-muted",
};

export default async function AdminDemandsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSection("demands");
  const sp = await searchParams;
  const status = demandStatuses.find((s) => s === sp.status);

  let all: PropertyDemand[] = [];
  let counts = new Map<string, { total: number; good: number }>();
  let loadError: string | null = null;
  try {
    all = await demandService.list();
    counts = await demandService.matchCounts(all);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the demands.";
  }

  // Properties that can be sent to customers (never anything sold or hidden).
  let properties: ShareableProperty[] = [];
  try {
    properties = (await propertyService.list())
      .filter((p) => p.status === "Available")
      .map((p) => ({ id: p.id, slug: p.slug, title: p.title, location: p.location, size: p.size, price: p.price, documents: p.documents }));
  } catch {
    properties = [];
  }

  const shown = status ? all.filter((d) => d.status === status) : all;
  const rows: ContactRow[] = shown.map((d) => {
    const c = counts.get(d.id);
    return {
      id: d.id,
      name: d.clientName,
      phone: d.clientPhone,
      whatsapp: d.clientWhatsapp || d.clientPhone,
      wants: `${d.purpose === "For Sale" ? "Buy" : "Rent"} - ${d.propertyTypes.length ? d.propertyTypes.join(", ") : "any type"}`,
      where: d.locations.length ? d.locations.join(", ") : "Anywhere",
      budget: describeBudget(d),
      size: describeSize(d),
      remarks: d.notes ?? "",
      status: d.status,
      statusTone: STATUS_TONE[d.status],
      urgent: d.priority === "Urgent" || d.priority === "High" ? d.priority : "",
      matchLabel: c && c.total > 0 ? (c.good > 0 ? `${c.good} good` : `${c.total} possible`) : "",
      added: formatDateOnlyShort(d.createdAt.slice(0, 10)),
    };
  });
  const tally = (s: DemandStatus) => all.filter((d) => d.status === s).length;
  const waitingWithMatch = all.filter((d) => (d.status === "Open" || d.status === "Matched") && (counts.get(d.id)?.good ?? 0) > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Customer Contacts</h1>
          <p className="mt-1 text-sm text-muted">Every customer with their number, what they are looking for and your remarks. Tick customers to send them a WhatsApp or SMS, a property or a document. Private - never shown on the website.</p>
        </div>
        <Link href="/admin/demands/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <PlusCircle className="h-4 w-4" /> Add Customer
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting" value={tally("Open") + tally("Matched")} icon={ClipboardCheck} tone="primary" />
        <StatCard label="With a good match" value={waitingWithMatch} icon={Sparkles} tone="success" />
        <StatCard label="Closed" value={tally("Closed")} icon={Handshake} />
        <StatCard label="Lost" value={tally("Lost")} icon={XCircle} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[undefined, ...demandStatuses].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/demands?status=${s}` : "/admin/demands"}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${status === s ? "bg-ink text-white" : "border border-border text-ink hover:bg-surface-muted"}`}
          >
            {s ?? "All"} ({s ? tally(s) : all.length})
          </Link>
        ))}
      </div>

      <DemandContactsTable rows={rows} properties={properties} />
    </div>
  );
}
