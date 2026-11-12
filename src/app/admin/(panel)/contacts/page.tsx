import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { contactService } from "@/services/contactService";
import { propertyService } from "@/services/propertyService";
import { matchPropertiesToContact } from "@/lib/contactMatching";
import { formatMarla, formatPrice } from "@/lib/pkUnits";
import { formatDateOnlyShort } from "@/lib/date";
import type { CustomerContact } from "@/lib/models/contact";
import type { Property } from "@/lib/models/property";
import {
  CustomerContactsView,
  type ContactRow,
  type MatchLite,
  type ShareableProperty,
} from "@/components/admin/CustomerContactsView";

export const metadata: Metadata = { title: "Customer Contacts" };
export const dynamic = "force-dynamic";

function wantsLine(c: CustomerContact): string {
  const parts = [
    c.purpose ? (c.purpose === "For Sale" ? "Buy" : "Rent") : "",
    c.propertyType ?? "",
    c.area ?? "",
    c.budgetMax != null ? `up to ${formatPrice(c.budgetMax)}` : "",
    c.sizeMarla != null ? formatMarla(c.sizeMarla) : "",
  ].filter(Boolean);
  return parts.join(" - ");
}

export default async function AdminContactsPage() {
  await requireSection("contacts");

  let contacts: CustomerContact[] = [];
  let loadError: string | null = null;
  try {
    contacts = await contactService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the contacts.";
  }

  let all: Property[] = [];
  try {
    all = await propertyService.list();
  } catch {
    all = [];
  }
  const available = all.filter((p) => p.status === "Available");

  const matches: Record<string, MatchLite[]> = {};
  const rows: ContactRow[] = contacts.map((c) => {
    const found = matchPropertiesToContact(c, available).slice(0, 8);
    if (found.length) {
      matches[c.id] = found.map((m) => ({
        id: m.property.id,
        slug: m.property.slug,
        title: m.property.title,
        location: m.property.location,
        size: m.property.size,
        price: m.property.price,
        score: m.score,
        level: m.level,
      }));
    }
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      whatsapp: c.whatsapp || c.phone,
      whatsappRaw: c.whatsapp ?? "",
      propertyDetail: c.propertyDetail ?? "",
      remarks: c.remarks ?? "",
      source: c.source,
      purpose: c.purpose ?? "",
      propertyType: c.propertyType ?? "",
      area: c.area ?? "",
      budgetText: c.budgetMax != null ? formatPrice(c.budgetMax) : "",
      sizeText: c.sizeMarla != null ? formatMarla(c.sizeMarla) : "",
      wants: wantsLine(c),
      added: formatDateOnlyShort(c.createdAt.slice(0, 10)),
    };
  });

  const properties: ShareableProperty[] = available.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    location: p.location,
    size: p.size,
    price: p.price,
    documents: p.documents,
  }));

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Customer Contacts</h1>
        <p className="mt-1 text-sm text-muted">
          Write down every visitor or caller - name, number, what they want and your remarks. Tick customers to send them a WhatsApp or SMS, a property or a
          document. Private - never shown on the website.
        </p>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <CustomerContactsView rows={rows} matches={matches} properties={properties} />
    </div>
  );
}
