import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { requireSection } from "@/lib/guard";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { NewValuationForm } from "@/components/admin/investment/NewValuationForm";

export const dynamic = "force-dynamic";

export default async function NewValuationPage() {
  await requireSection("investment");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageFinance(admin.role)) redirect("/admin/investment/valuation");

  const properties = await propertyService.list();

  return (
    <div>
      <Link href="/admin/investment/valuation" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Valuations
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Property Valuation</h1>
      <p className="mt-1 text-sm text-muted">Select a property, review real comparable candidates, and approve the ones to include. This creates a new immutable version — it never overwrites a prior valuation.</p>

      <div className="mt-6">
        <NewValuationForm properties={properties.map((p) => ({ id: p.id, title: p.title, location: p.location, type: p.type }))} />
      </div>
    </div>
  );
}
