import Link from "next/link";
import { BadgeCheck, BookOpen, FileText, IdCard, Image as ImageIcon, Signpost, Stamp, Tags } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/admin/stationery/letterhead", icon: FileText, title: "Company Letterhead", desc: "Write a letter (English or Urdu) on the company letterhead and print it, or print the blank letterhead on A4." },
  { href: "/admin/stationery/business-cards", icon: IdCard, title: "Business Cards", desc: "Cards for you and your team: name, numbers, logo and QR code. Ten per A4 sheet, front and back." },
  { href: "/admin/stationery/company-profile", icon: BookOpen, title: "Company Profile Brochure", desc: "A two-page A4 brochure: who we are, our services, how to reach us. Print or send the PDF." },
  { href: "/admin/stationery/flex", icon: ImageIcon, title: "Flex Banner Design", desc: "Flex for the company, or a flex for any property with its photo, price and phone. Saves a PDF at the exact flex size." },
  { href: "/admin/stationery/signboard", icon: Signpost, title: "Property Signboard", desc: "A big FOR SALE / FOR RENT poster with the details, phone number and QR code for the property." },
  { href: "/admin/stationery/stickers", icon: Tags, title: "Company Stickers", desc: "Round logo stickers, address labels and For Sale / For Rent stickers - a full A4 sheet." },
  { href: "/admin/stationery/stamp", icon: Stamp, title: "Stamp / Seal Design", desc: "Artwork for the round seal or rectangular rubber stamp, to give to the stamp maker." },
  { href: "/admin/stationery/id-cards", icon: BadgeCheck, title: "Staff ID Cards", desc: "Identity cards for the team with photo and company details. Eight per A4 sheet." },
];

export default async function StationeryPage() {
  await requireSection("brochures");
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Letterhead, Cards &amp; Printables</h1>
      <p className="mt-1 text-sm text-muted">The company&apos;s printed stationery with the logo and details, ready to print on your own printer or to hand to a printing press. Property agreements and receipts are under Rentals and Deals.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary">
            <t.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-heading text-base font-bold text-ink group-hover:text-primary">{t.title}</h2>
            <p className="mt-1 text-sm text-muted">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
