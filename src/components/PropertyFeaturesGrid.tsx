import {
  BedDouble,
  Bath,
  Car,
  Building,
  Zap,
  Droplet,
  Flame,
  Route,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

// Only used to pick a nicer icon for common feature keywords — the
// features themselves are entirely free text, admin-entered (see
// PropertyForm's "Features" field). Nothing here invents data; a
// feature the admin never typed simply never appears.
const ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /bed/i, icon: BedDouble },
  { match: /bath/i, icon: Bath },
  { match: /park|garage|car porch/i, icon: Car },
  { match: /floor|storey|story/i, icon: Building },
  { match: /electric/i, icon: Zap },
  { match: /water/i, icon: Droplet },
  { match: /gas/i, icon: Flame },
  { match: /road/i, icon: Route },
];

function iconFor(feature: string): LucideIcon {
  return ICONS.find((i) => i.match.test(feature))?.icon ?? CheckCircle2;
}

export function PropertyFeaturesGrid({ features, title = "Features" }: { features: string[]; title?: string }) {
  if (features.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {features.map((f) => {
          const Icon = iconFor(f);
          return (
            <div key={f} className="flex items-center gap-2.5 rounded-xl border border-border p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink">{f}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
