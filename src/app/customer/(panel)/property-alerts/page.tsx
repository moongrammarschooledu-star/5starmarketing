import { customerService } from "@/services/customerService";
import { propertyAlertService } from "@/services/propertyAlertService";
import { PropertyAlertManager } from "@/components/customer/PropertyAlertManager";

export const metadata = { title: "Property Alerts" };
export const dynamic = "force-dynamic";

export default async function PropertyAlertsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const alerts = await propertyAlertService.list(customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Property Alerts</h1>
      <p className="mt-1 text-sm text-muted">
        Tell us what you&apos;re looking for. This is an early, optional feature — no automated
        email or WhatsApp notifications are sent yet.
      </p>

      <div className="mt-6">
        <PropertyAlertManager alerts={alerts} />
      </div>
    </div>
  );
}
