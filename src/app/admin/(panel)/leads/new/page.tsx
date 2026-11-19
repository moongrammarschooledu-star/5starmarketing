import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppLeadForm } from "@/components/admin/WhatsAppLeadForm";
import { requireSection } from "@/lib/guard";

export const metadata: Metadata = { title: "Add Lead from WhatsApp" };
export const dynamic = "force-dynamic";

export default async function NewWhatsAppLeadPage() {
  await requireSection("leads");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/leads" className="text-xs font-semibold text-primary hover:underline">
        ← Leads
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">WhatsApp chat se lead banayein</h1>
      <p className="mt-1 text-sm text-muted">
        Ad dabane wale log seedha WhatsApp par aate hain, website par nahi. Jo chat serious lage us ki detail yahan likh dein,
        taake wo CRM, follow-up aur Marketing ki ginti mein aaye.
      </p>
      <div className="mt-6">
        <WhatsAppLeadForm />
      </div>
    </div>
  );
}
