import { requireSection } from "@/lib/guard";
import { aiInsightService } from "@/services/aiInsightService";
import { InsightsPanel } from "./InsightsPanel";

export const dynamic = "force-dynamic";

export default async function AiInsightsPage() {
  await requireSection("ai");
  const insights = await aiInsightService.list("OPEN");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Smart Insights</h1>
      <p className="mt-1 text-sm text-muted">
        Generated from real, current records — lead inactivity, lease expiry, SLA risk, maintenance backlog. Each
        insight shows its data source, time period and reason; nothing here claims proven causation.
      </p>
      <InsightsPanel initialInsights={insights} />
    </div>
  );
}
