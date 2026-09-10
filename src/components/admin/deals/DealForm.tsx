"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { Lead } from "@/lib/models/lead";
import type { DealType } from "@/lib/models/deal";
import { dealTypes } from "@/lib/models/deal";
import { createDealAction } from "@/lib/actions/deals.actions";
import { useToast } from "@/components/admin/ToastProvider";

const PURPOSE_TO_DEAL_TYPE: Record<string, DealType> = { Buy: "Property Sale", Rent: "Property Rent", Invest: "Investment" };

export function DealForm({
  lead,
  properties,
  projects,
  agents,
  defaultCommissionRate,
}: {
  lead?: Lead;
  properties: { id: string; title: string; status: string; priceValue?: number }[];
  projects: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  defaultCommissionRate?: number;
}) {
  const [propertyId, setPropertyId] = useState(lead?.propertyId ?? "");
  const [projectId, setProjectId] = useState(lead?.projectId ?? "");
  const [agentId, setAgentId] = useState(lead?.assignedAgentId ?? "");
  const [dealType, setDealType] = useState<DealType>((lead?.purpose && PURPOSE_TO_DEAL_TYPE[lead.purpose]) || "Property Sale");
  const [negotiatedPrice, setNegotiatedPrice] = useState<string>(() => {
    const property = properties.find((p) => p.id === lead?.propertyId);
    return property?.priceValue ? String(property.priceValue) : "";
  });
  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [commissionRate, setCommissionRate] = useState(defaultCommissionRate ? String(defaultCommissionRate) : "");
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    setError(null);
    const priceNum = Number(negotiatedPrice);
    if (!negotiatedPrice || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Please enter a valid negotiated price.");
      return;
    }
    const property = properties.find((p) => p.id === propertyId);

    startTransition(async () => {
      try {
        const deal = await createDealAction({
          leadId: lead?.id,
          customerId: lead?.customerId,
          propertyId: propertyId || undefined,
          projectId: projectId || undefined,
          agentId: agentId || undefined,
          sellerName: sellerName || undefined,
          sellerPhone: sellerPhone || undefined,
          dealType,
          negotiatedPrice: priceNum,
          discountAmount: 0,
          bookingAmount: bookingAmount ? Number(bookingAmount) : 0,
          bookingDate: bookingDate || undefined,
          expectedCompletionDate: expectedCompletionDate || undefined,
          commissionRate: commissionRate ? Number(commissionRate) : undefined,
          propertyPrice: property?.priceValue,
        });
        toast.show(`${deal.dealNumber} created.`);
        router.push(`/admin/deals/${deal.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create this deal.");
      }
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      {lead && (
        <div className="rounded-xl bg-surface-muted p-3.5 text-sm">
          <span className="font-bold text-ink">{lead.name}</span> — {lead.phone}
          {lead.propertyTitle && <span className="text-muted"> · {lead.propertyTitle}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Deal Type *</span>
          <select value={dealType} onChange={(e) => setDealType(e.target.value as DealType)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {dealTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Property</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Project</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Assigned Agent</span>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Negotiated Price (PKR) *</span>
          <input
            type="number"
            min={0}
            value={negotiatedPrice}
            onChange={(e) => setNegotiatedPrice(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Commission Rate (%)</span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Booking Amount (PKR)</span>
          <input
            type="number"
            min={0}
            value={bookingAmount}
            onChange={(e) => setBookingAmount(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Booking Date</span>
          <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Expected Completion</span>
          <input
            type="date"
            value={expectedCompletionDate}
            onChange={(e) => setExpectedCompletionDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Seller / Owner (optional)</h3>
        <p className="mt-1 text-xs text-muted">This platform doesn&apos;t yet manage owner accounts — just a name/contact for your own reference on a resale deal.</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Seller name"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Seller phone"
            value={sellerPhone}
            onChange={(e) => setSellerPhone(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create Deal"}
      </button>
    </div>
  );
}
