import Link from "next/link";
import { Heart, MessageSquare, CalendarClock, Building2, BookmarkCheck, UserCircle, MessageCircle } from "lucide-react";
import { customerService } from "@/services/customerService";
import { favoritesService } from "@/services/favoritesService";
import { leadService } from "@/services/leadService";
import { propertyService } from "@/services/propertyService";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PropertyCard } from "@/components/PropertyCard";
import { ComparedCountBadge } from "@/components/customer/ComparedCountBadge";
import { whatsappLink } from "@/lib/site";
import type { Property } from "@/lib/models/property";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null; // layout already redirects; satisfies TS

  const [favorites, inquiries] = await Promise.all([
    favoritesService.listProperties(customer.id),
    leadService.listByCustomer(customer.id),
  ]);

  const activeFollowUps = inquiries.filter((l) => l.status === "Follow-Up").length;

  // Recommendations: based on favorites first, then inquiries, else
  // featured properties — never based on anything private.
  let recommended: Property[] = [];
  const seedProperty = favorites[0] ?? (inquiries[0]?.propertyId ? await propertyService.getById(inquiries[0].propertyId) : undefined);
  if (seedProperty) {
    recommended = await propertyService.listRelated(seedProperty, 4);
  }
  if (recommended.length === 0) {
    recommended = await propertyService.listFeatured(4);
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Welcome, {customer.fullName}</h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s an overview of your 5STAR.M account.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Saved Properties" value={favorites.length} icon={Heart} tone="primary" />
        <ComparedCountBadge />
        <StatCard label="My Inquiries" value={inquiries.length} icon={MessageSquare} />
        <StatCard label="Active Follow-Ups" value={activeFollowUps} icon={CalendarClock} tone="success" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <QuickAction href="/properties" icon={Building2} label="Browse Properties" primary />
        <QuickAction href="/customer/favorites" icon={Heart} label="Saved Properties" />
        <QuickAction href="/customer/inquiries" icon={MessageSquare} label="My Inquiries" />
        <QuickAction href="/customer/profile" icon={UserCircle} label="My Profile" />
        <QuickAction
          href={whatsappLink(`Assalam-o-Alaikum 5STAR.M, this is ${customer.fullName}. I'd like some help.`)}
          icon={MessageCircle}
          label="Contact 5STAR.M"
          external
        />
      </div>

      {inquiries.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-ink">Recent Inquiries</h2>
            <Link href="/customer/inquiries" className="text-xs font-bold text-primary">
              View all →
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {inquiries.slice(0, 3).map((l) => (
              <Link
                key={l.id}
                href={`/customer/inquiries/${l.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">{l.propertyTitle ?? "General inquiry"}</div>
                  <div className="text-xs text-muted">
                    {new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-base font-bold text-ink">
            {favorites.length > 0 || inquiries.length > 0 ? "Recommended Properties" : "Featured Properties"}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-border bg-surface p-5 text-xs text-muted-foreground">
        <BookmarkCheck className="mb-1.5 h-4 w-4 text-primary" /> Want alerts for new matching properties? Try{" "}
        <Link href="/customer/saved-searches" className="font-semibold text-primary hover:underline">
          Saved Searches
        </Link>
        .
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
  external,
}: {
  href: string;
  icon: typeof Building2;
  label: string;
  primary?: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={
        primary
          ? "flex flex-col items-center gap-2 rounded-2xl bg-primary p-4 text-center text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          : "flex flex-col items-center gap-2 rounded-2xl border-2 border-ink/10 p-4 text-center text-xs font-bold text-ink hover:border-primary hover:text-primary"
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
