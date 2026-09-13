import { Download } from "lucide-react";
import { constructionReportService } from "@/services/constructionReportService";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";

export const dynamic = "force-dynamic";

export default async function ConstructionReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [phaseProgress, materialConsumption] = await Promise.all([constructionReportService.phaseProgressForProject(id), constructionReportService.materialConsumptionForProject(id)]);

  const exports = [
    { type: "boq", label: "Bill of Quantities" },
    { type: "materials", label: "Materials" },
    { type: "expenses", label: "Expenses" },
    { type: "tasks", label: "Tasks" },
  ];

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Reports</h2>
      <p className="mt-1 text-xs text-muted">Profitability (estimated vs. actual) is shown on the Overview tab. Here: progress charts and raw data exports.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountBucketChart title="Phase Progress (%)" data={phaseProgress} empty="No phases recorded yet." />
        <CountBucketChart title="Material Consumption (used quantity)" data={materialConsumption} empty="No material usage recorded yet." />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {exports.map((e) => (
          <a key={e.type} href={`/admin/construction/projects/${id}/export?type=${e.type}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-ink">{e.label}</p>
              <p className="text-xs text-muted">Export as CSV</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
