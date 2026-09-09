import { Home, Tag, MapPin, Ruler, Wallet, CreditCard, Activity } from "lucide-react";
import type { Property } from "@/lib/models/property";

export function PropertyInfoPanel({ property }: { property: Property }) {
  const rows = [
    { icon: Home, label: "Property Type", value: property.type },
    { icon: Tag, label: "Purpose", value: property.purpose },
    { icon: MapPin, label: "Location", value: property.location },
    { icon: Ruler, label: "Size", value: property.size },
    { icon: Wallet, label: "Price", value: property.price },
    { icon: CreditCard, label: "Payment Option", value: property.paymentOption },
    { icon: Activity, label: "Status", value: property.status },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">Property Information</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <r.icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="truncate text-sm font-semibold text-ink">{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
