import { customerService } from "@/services/customerService";
import { investmentAnalysisService } from "@/services/investmentAnalysisService";
import { investmentAlertService } from "@/services/investmentAlertService";
import { SavedAnalysesList } from "@/components/customer/investments/SavedAnalysesList";
import { InvestmentAlertsManager } from "@/components/customer/investments/InvestmentAlertsManager";
import { CreateAlertForm } from "@/components/customer/investments/CreateAlertForm";

export const metadata = { title: "My Investments" };
export const dynamic = "force-dynamic";

export default async function CustomerInvestmentsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  await investmentAlertService.checkPriceAndAvailabilityAlerts().catch(() => {});
  const [analyses, alerts] = await Promise.all([investmentAnalysisService.listForCustomer(customer.id), investmentAlertService.listForCustomer(customer.id)]);

  const propertiesForAlerts = [...new Map(analyses.filter((a) => a.propertyId).map((a) => [a.propertyId!, { id: a.propertyId!, title: a.propertyTitle ?? "Property" }])).values()];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Investments</h1>
      <p className="mt-1 text-sm text-muted">Your saved analyses, calculations, and alerts — visible only to you.</p>

      <div className="mt-6">
        <h2 className="font-heading text-lg font-bold text-ink">Saved Analyses</h2>
        <div className="mt-3">
          <SavedAnalysesList analyses={analyses} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Investment Alerts</h2>
        <div className="mt-3">
          <CreateAlertForm properties={propertiesForAlerts} />
        </div>
        <div className="mt-4">
          <InvestmentAlertsManager alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
