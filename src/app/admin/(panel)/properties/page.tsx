import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { PropertiesTable } from "@/components/admin/PropertiesTable";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  const properties = await propertiesRepository.list();

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
        <PropertiesTable properties={properties} />
      </div>
    </div>
  );
}
