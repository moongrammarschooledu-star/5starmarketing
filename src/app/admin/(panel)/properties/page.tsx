import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { PropertiesTable } from "@/components/admin/PropertiesTable";
import { requireSection } from "@/lib/guard";
import { ownerDetailsService } from "@/services/ownerDetailsService";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  await requireSection("properties");
  const properties = await propertyService.list();
  let owners: Awaited<ReturnType<typeof ownerDetailsService.listForProperties>> = {};
  let ownersFailed = false;
  try {
    owners = await ownerDetailsService.listForProperties();
  } catch {
    ownersFailed = true;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Properties</h1>
          <p className="mt-1 text-sm text-muted">Manage all property listings.</p>
        </div>
        <Link
          href="/admin/properties/new"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Add Property
        </Link>
      </div>

      <div className="mt-6">
        <PropertiesTable properties={properties} owners={owners} ownersFailed={ownersFailed} />
      </div>
    </div>
  );
}
