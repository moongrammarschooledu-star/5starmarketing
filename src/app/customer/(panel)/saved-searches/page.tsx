import Link from "next/link";
import { customerService } from "@/services/customerService";
import { savedSearchService } from "@/services/savedSearchService";
import { SavedSearchManager } from "@/components/customer/SavedSearchManager";

export const metadata = { title: "Saved Searches" };
export const dynamic = "force-dynamic";

export default async function SavedSearchesPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const searches = await savedSearchService.list(customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Saved Searches</h1>
      <p className="mt-1 text-sm text-muted">
        Save a search to quickly find properties that match your requirements. Want alerts too?{" "}
        <Link href="/customer/property-alerts" className="font-semibold text-primary hover:underline">
          Set up a property alert
        </Link>
        .
      </p>

      <div className="mt-6">
        <SavedSearchManager searches={searches} />
      </div>
    </div>
  );
}
