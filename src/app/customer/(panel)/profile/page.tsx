import { redirect } from "next/navigation";
import { customerService } from "@/services/customerService";
import { CustomerProfileForm } from "@/components/customer/CustomerProfileForm";
import { CustomerConsentForm } from "@/components/customer/CustomerConsentForm";

export const metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Profile</h1>
      <p className="mt-1 text-sm text-muted">{customer.fullName} — {customer.email}</p>

      <div className="mt-6 space-y-6">
        <CustomerProfileForm customer={customer} />
        <CustomerConsentForm customer={customer} />
      </div>
    </div>
  );
}
