import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { rentalSettingsService } from "@/services/rentalSettingsService";
import { profileService } from "@/services/profileService";
import { canManageRentals } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { RentalSettingsForm } from "@/components/admin/rentals/RentalSettingsForm";

export const dynamic = "force-dynamic";

export default async function RentalSettingsPage() {
  await requireSection("rentals");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageRentals(admin.role)) redirect("/admin/rentals");

  const settings = await rentalSettingsService.get();

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rental Settings</h1>
      <p className="mt-1 text-sm text-muted">Default late fee rule, grace period, and reminder lead times.</p>

      <div className="mt-6">
        <RentalSettingsForm settings={settings} />
      </div>
    </div>
  );
}
