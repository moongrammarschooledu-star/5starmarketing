import { InventoryBulkImport } from "@/components/admin/inventory/InventoryBulkImport";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function InventoryImportPage() {
  await requireSection("inventory");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Bulk Import Inventory</h1>
      <p className="mt-1 text-sm text-muted">Upload a CSV, review the validation report, then confirm — invalid or duplicate rows are never imported.</p>

      <div className="mt-6 max-w-3xl">
        <InventoryBulkImport />
      </div>
    </div>
  );
}
