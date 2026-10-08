import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, AlertTriangle, ExternalLink, Pencil, Phone, Sparkles } from "lucide-react";
import { demandService } from "@/services/demandService";
import { requireSection } from "@/lib/guard";
import { describeBudget, describeSize } from "@/lib/demandText";
import { DemandStatusControl } from "@/components/admin/DemandStatusControl";
import { DemandShareButton } from "@/components/admin/DemandShareButton";
import type { DemandMatch } from "@/lib/demandMatching";

export const metadata: Metadata = { title: "Demand" };
export const dynamic = "force-dynamic";

const LEVEL_TONE = {
  Strong: "bg-success/10 text-success",
  Good: "bg-primary/10 text-primary",
  Partial: "bg-amber-500/10 text-amber-700",
} as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{children}</span>
    </div>
  );
}

function MatchCard({
  match,
  demandId,
  clientName,
  clientNumber,
  shared,
}: {
  match: DemandMatch;
  demandId: string;
  clientName: string;
  clientNumber: string;
  shared: boolean;
}) {
  const p = match.property;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/properties/${p.id}/edit`} className="font-heading text-base font-bold text-ink hover:text-primary">
            {p.title}
          </Link>
          <div className="mt-0.5 text-xs text-muted">
            {p.location} - {p.size} - <span className="font-bold text-ink">{p.price}</span>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${LEVEL_TONE[match.level]}`}>
          {match.score}% {match.level}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {match.reasons.map((r) => (
          <li key={r} className="flex items-start gap-2 text-xs text-ink">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {r}
          </li>
        ))}
        {match.concerns.map((c) => (
          <li key={c} className="flex items-start gap-2 text-xs font-semibold text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <DemandShareButton
          demandId={demandId}
          clientName={clientName}
          clientNumber={clientNumber}
          alreadyShared={shared}
          property={{ id: p.id, slug: p.slug, title: p.title, location: p.location, size: p.size, price: p.price }}
        />
        <Link href={`/properties/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          View on website <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export default async function DemandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("demands");
  const { id } = await params;
  const demand = await demandService.getById(id);
  if (!demand) notFound();

  const [matches, sharedIds] = await Promise.all([demandService.matchesFor(demand), demandService.listSharedPropertyIds(id)]);
  const best = matches.filter((m) => m.score >= 70);
  const maybe = matches.filter((m) => m.score < 70);
  const waiting = demand.status === "Open" || demand.status === "Matched";
  const clientNumber = demand.clientWhatsapp || demand.clientPhone;

  return (
    <div>
      <Link href="/admin/demands" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Demands
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{demand.clientName}</h1>
          <a href={`tel:${demand.clientPhone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Phone className="h-3.5 w-3.5" /> {demand.clientPhone}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/demands/${id}/edit`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <DemandStatusControl id={id} status={demand.status} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-heading text-base font-bold text-ink">Looking for</h2>
            <Row label="Wants to">{demand.purpose === "For Sale" ? "Buy" : "Rent"}</Row>
            <Row label="Type">{demand.propertyTypes.length ? demand.propertyTypes.join(", ") : "Any type"}</Row>
            <Row label="Areas">{demand.locations.length ? demand.locations.join(", ") : "Anywhere"}</Row>
            <Row label="Budget">{describeBudget(demand)}</Row>
            <Row label="Size">{describeSize(demand)}</Row>
            {demand.minBedrooms != null && <Row label="Bedrooms">{demand.minBedrooms}+</Row>}
            <Row label="Priority">{demand.priority}</Row>
            <Row label="Assigned to">{demand.assignedToName ?? "Not assigned"}</Row>
            {demand.createdByName && <Row label="Added by">{demand.createdByName}</Row>}
          </div>
          {demand.notes && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-heading text-base font-bold text-ink">Notes</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-ink">{demand.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
            <Sparkles className="h-4.5 w-4.5 text-primary" /> Matching properties ({matches.length})
          </h2>

          {!waiting && (
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
              This demand is {demand.status.toLowerCase()}. Matches are shown for open demands, so these are for reference only.
            </p>
          )}

          {matches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted">
              No available property fits this demand yet. When a matching property is added, the team will be alerted automatically.
            </div>
          )}

          {best.length > 0 && (
            <div className="space-y-3">
              {best.map((m) => (
                <MatchCard key={m.property.id} match={m} demandId={id} clientName={demand.clientName} clientNumber={clientNumber} shared={sharedIds.has(m.property.id)} />
              ))}
            </div>
          )}

          {maybe.length > 0 && (
            <div className="space-y-3">
              <h3 className="pt-2 text-sm font-bold text-muted">Worth a look - close, but something does not fit ({maybe.length})</h3>
              {maybe.map((m) => (
                <MatchCard key={m.property.id} match={m} demandId={id} clientName={demand.clientName} clientNumber={clientNumber} shared={sharedIds.has(m.property.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
