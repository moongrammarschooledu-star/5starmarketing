import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Boxes } from "lucide-react";
import { projectService } from "@/services/projectService";
import { investmentReportService } from "@/services/investmentReportService";
import { investmentScenarioService } from "@/services/investmentScenarioService";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { InvestmentCrmActions } from "@/components/investment/InvestmentCrmActions";
import { projectAppreciation } from "@/lib/investment/calculations";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await projectService.getBySlug(slug);
  if (!project) return { title: "Project Not Found" };
  return { title: `Investment Analysis — ${project.name}`, robots: { index: false } };
}

export default async function ProjectInvestmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await projectService.getBySlug(slug);
  if (!project) notFound();

  const [summary, scenarios, settings] = await Promise.all([investmentReportService.projectInvestmentSummary(project.id), investmentScenarioService.list(true), valuationSettingsService.get()]);

  const defaultScenario = scenarios.find((s) => s.isDefault) ?? scenarios[0];
  const appreciation = summary.averagePrice && defaultScenario ? projectAppreciation(summary.averagePrice, defaultScenario.annualAppreciationRate, settings.defaultInvestmentHorizonYears) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to {project.name}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink sm:text-3xl">Project Investment Analysis</h1>
      <p className="mt-1 text-sm text-muted">{project.name} — {project.location}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Inventory" value={String(summary.totalInventory)} />
        <Stat label="Available Units" value={String(summary.availableUnits)} accent />
        <Stat label="Reserved" value={String(summary.reservedUnits)} />
        <Stat label="Sold / Booked" value={String(summary.soldUnits + summary.bookedUnits)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Average Price" value={summary.averagePrice != null ? formatPKR(summary.averagePrice) : "Data unavailable"} />
        <Stat label="Price Range" value={summary.minPrice != null && summary.maxPrice != null ? `${formatPKR(summary.minPrice)} – ${formatPKR(summary.maxPrice)}` : "Data unavailable"} />
        <Stat label="Price per Marla" value={summary.averagePricePerMarla != null ? formatPKR(summary.averagePricePerMarla) : "Data unavailable"} />
      </div>

      {project.paymentOptions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
            <Boxes className="h-4 w-4 text-primary" /> Payment Options
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.paymentOptions.map((o) => (
              <span key={o} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
                {o}
              </span>
            ))}
          </div>
        </div>
      )}

      {appreciation.length > 0 && defaultScenario && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">Estimated Appreciation ({defaultScenario.name} scenario, {defaultScenario.annualAppreciationRate}%/year)</h2>
          <p className="mt-1 text-xs text-muted">Projected value based on the selected assumptions, using this project&apos;s average unit price as the starting point.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {appreciation.map((y) => (
              <div key={y.year} className="rounded-xl bg-surface-muted p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Year {y.year}</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{formatPKR(y.projectedValue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <InvestmentCrmActions projectId={project.id} itemLabel={project.name} />
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-muted p-4 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> {settings.disclaimerText}
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
