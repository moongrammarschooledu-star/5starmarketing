import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";
import { leadService } from "@/services/leadService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { crmStatusLabel } from "@/lib/models/crm";
import { scoreLevels, scoreLevelLabels, type ScoreLevel } from "@/lib/models/leadScoring";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function MarketingLeadsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  await requireSection("marketing");
  const sp = await searchParams;
  const activeLevel = scoreLevels.includes(sp.level as ScoreLevel) ? (sp.level as ScoreLevel) : undefined;

  const [counts, result] = await Promise.all([
    Promise.all(scoreLevels.map(async (level) => ({ level, total: (await leadService.search({ scoreLevel: level, pageSize: 1 })).total }))),
    leadService.search({ scoreLevel: activeLevel, pageSize: 50 }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Leads</h1>
          <p className="mt-1 text-sm text-muted">Every lead, ranked by score. For full search/filter/export, use the CRM leads list.</p>
        </div>
        <Link href="/admin/crm/leads" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          Full CRM List <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/marketing/leads" className={`rounded-full px-4 py-2 text-xs font-bold ${!activeLevel ? "bg-primary text-primary-foreground" : "bg-surface-muted text-ink"}`}>
          All
        </Link>
        {counts.map(({ level, total }) => (
          <Link key={level} href={`/admin/marketing/leads?level=${level}`} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${activeLevel === level ? "bg-primary text-primary-foreground" : "bg-surface-muted text-ink"}`}>
            {level === "HOT" || level === "VERY_HOT" ? <Flame className="h-3.5 w-3.5" /> : null}
            {scoreLevelLabels[level]} ({total})
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {result.leads.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">No leads at this level.</p>}
        {result.leads
          .slice()
          .sort((a, b) => b.score - a.score)
          .map((l) => (
            <Link key={l.id} href={`/admin/crm/leads/${l.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{l.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {l.propertyTitle ?? l.projectName ?? "General inquiry"} · {l.source} · {l.assignedTo || "Unassigned"}
                </p>
                {l.tags && l.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {l.tags.map((t) => (
                      <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={crmStatusLabel(l.status)} />
                <StatusBadge status={l.scoreLevel} />
                <span className="font-heading text-lg font-extrabold text-ink">{l.score}</span>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
