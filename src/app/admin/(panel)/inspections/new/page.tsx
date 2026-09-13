import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { NewInspectionForm } from "@/components/admin/maintenance/NewInspectionForm";

export const dynamic = "force-dynamic";

export default async function NewInspectionPage() {
  await requireSection("maintenance");
  const [properties, supabase] = await Promise.all([propertyService.list(), createClient()]);
  const { data: staff } = await supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin"]).eq("status", "Active");

  return (
    <div>
      <Link href="/admin/inspections" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Inspections
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Property Inspection</h1>

      <div className="mt-6">
        <NewInspectionForm properties={properties.map((p) => ({ id: p.id, title: p.title }))} staff={staff ?? []} />
      </div>
    </div>
  );
}
