import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionRisk, ConstructionRiskInput, RiskLevel, RiskStatus } from "@/lib/models/construction";

const LEVEL_SCORE: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionRisk {
  return {
    id: row.id,
    projectId: row.project_id,
    risk: row.risk,
    category: row.category,
    probability: row.probability,
    impact: row.impact,
    riskScore: row.risk_score,
    ownerName: row.admin_profiles?.name ?? undefined,
    mitigation: row.mitigation ?? undefined,
    status: row.status,
    reviewDate: row.review_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const constructionRiskService = {
  async list(projectId: string): Promise<ConstructionRisk[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_risks").select("*, admin_profiles(name)").eq("project_id", projectId).order("risk_score", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** risk_score = probability × impact (1-3 each → 1-9) — a transparent,
   *  disclosed score; never a claim the risk WILL occur (section 44). */
  async create(projectId: string, input: ConstructionRiskInput, actorId: string): Promise<ConstructionRisk> {
    const riskScore = LEVEL_SCORE[input.probability] * LEVEL_SCORE[input.impact];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_risks")
      .insert({
        project_id: projectId,
        risk: input.risk,
        category: input.category,
        probability: input.probability,
        impact: input.impact,
        risk_score: riskScore,
        owner_id: input.ownerId || actorId,
        mitigation: input.mitigation || null,
        review_date: input.reviewDate || null,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionRiskService.create failed:", error);
      throw new Error("Could not create this risk entry.");
    }
    return mapRow(data);
  },

  async updateStatus(id: string, status: RiskStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_risks").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this risk's status.");
  },
};
