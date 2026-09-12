import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CommissionRule, CommissionRuleInput, CommissionRuleTier, CommissionRuleCondition } from "@/lib/models/accounting";
import type { Deal } from "@/lib/models/deal";

const SELECT = "*, commission_rule_tiers(*), commission_rule_conditions(*)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CommissionRule {
  return {
    id: row.id,
    name: row.name,
    active: !!row.active,
    basis: row.basis,
    rate: row.rate != null ? Number(row.rate) : undefined,
    fixedAmount: row.fixed_amount != null ? Number(row.fixed_amount) : undefined,
    priority: row.priority,
    tiers: Array.isArray(row.commission_rule_tiers)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row.commission_rule_tiers.map((t: any): CommissionRuleTier => ({ id: t.id, ruleId: row.id, minAmount: Number(t.min_amount), maxAmount: t.max_amount != null ? Number(t.max_amount) : undefined, rate: Number(t.rate) }))
      : undefined,
    conditions: Array.isArray(row.commission_rule_conditions)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row.commission_rule_conditions.map((c: any): CommissionRuleCondition => ({ id: c.id, ruleId: row.id, conditionType: c.condition_type, conditionValue: c.condition_value }))
      : undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const commissionRuleService = {
  async list(activeOnly = false): Promise<CommissionRule[]> {
    const supabase = await createClient();
    let query = supabase.from("commission_rules").select(SELECT).order("priority", { ascending: true });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      console.error("commissionRuleService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<CommissionRule | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("commission_rules").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: CommissionRuleInput, actorId?: string): Promise<CommissionRule> {
    if (input.basis === "TIERED" && (!input.tiers || input.tiers.length === 0)) throw new Error("A tiered rule needs at least one tier.");
    if (input.basis === "FIXED" && input.fixedAmount == null) throw new Error("A fixed rule needs a fixed amount.");
    if ((input.basis === "DEAL_AMOUNT" || input.basis === "COLLECTED_AMOUNT") && input.rate == null) throw new Error("A percentage rule needs a rate.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("commission_rules")
      .insert({ name: input.name, active: input.active ?? true, basis: input.basis, rate: input.rate ?? null, fixed_amount: input.fixedAmount ?? null, priority: input.priority ?? 100, created_by: actorId || null })
      .select("*")
      .single();
    if (error) {
      console.error("commissionRuleService.create failed:", error);
      throw new Error("Could not create this commission rule.");
    }

    if (input.tiers?.length) {
      await supabase.from("commission_rule_tiers").insert(input.tiers.map((t) => ({ rule_id: data.id, min_amount: t.minAmount, max_amount: t.maxAmount ?? null, rate: t.rate })));
    }
    if (input.conditions?.length) {
      await supabase.from("commission_rule_conditions").insert(input.conditions.map((c) => ({ rule_id: data.id, condition_type: c.conditionType, condition_value: c.conditionValue })));
    }

    const created = await this.getById(data.id);
    if (!created) throw new Error("Could not load the newly created rule.");
    return created;
  },

  async update(id: string, input: Partial<CommissionRuleInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.active !== undefined) row.active = input.active;
    if (input.basis !== undefined) row.basis = input.basis;
    if (input.rate !== undefined) row.rate = input.rate;
    if (input.fixedAmount !== undefined) row.fixed_amount = input.fixedAmount;
    if (input.priority !== undefined) row.priority = input.priority;
    if (Object.keys(row).length > 0) {
      const { error } = await supabase.from("commission_rules").update(row).eq("id", id);
      if (error) throw new Error("Could not update this commission rule.");
    }

    if (input.tiers !== undefined) {
      await supabase.from("commission_rule_tiers").delete().eq("rule_id", id);
      if (input.tiers.length) await supabase.from("commission_rule_tiers").insert(input.tiers.map((t) => ({ rule_id: id, min_amount: t.minAmount, max_amount: t.maxAmount ?? null, rate: t.rate })));
    }
    if (input.conditions !== undefined) {
      await supabase.from("commission_rule_conditions").delete().eq("rule_id", id);
      if (input.conditions.length) await supabase.from("commission_rule_conditions").insert(input.conditions.map((c) => ({ rule_id: id, condition_type: c.conditionType, condition_value: c.conditionValue })));
    }
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("commission_rules").update({ active }).eq("id", id);
    if (error) throw new Error("Could not update this rule's status.");
  },

  /** Section 27 — resolves the ACTUAL commission amount for a rule
   *  against a given basis amount. Never assumes a basis; the caller
   *  (agentCommissionService) always passes the admin-selected rule. */
  resolveAmount(rule: CommissionRule, dealBasisAmount: number, collectedBasisAmount: number): { basisAmount: number; rate?: number; amount: number } {
    if (rule.basis === "FIXED") {
      return { basisAmount: 0, amount: Math.round((rule.fixedAmount ?? 0) * 100) / 100 };
    }
    if (rule.basis === "COLLECTED_AMOUNT") {
      const rate = rule.rate ?? 0;
      return { basisAmount: collectedBasisAmount, rate, amount: Math.round(collectedBasisAmount * (rate / 100) * 100) / 100 };
    }
    if (rule.basis === "TIERED") {
      const tiers = [...(rule.tiers ?? [])].sort((a, b) => a.minAmount - b.minAmount);
      const bracket = tiers.find((t) => dealBasisAmount >= t.minAmount && (t.maxAmount == null || dealBasisAmount < t.maxAmount));
      const rate = bracket?.rate ?? 0;
      return { basisAmount: dealBasisAmount, rate, amount: Math.round(dealBasisAmount * (rate / 100) * 100) / 100 };
    }
    // DEAL_AMOUNT
    const rate = rule.rate ?? 0;
    return { basisAmount: dealBasisAmount, rate, amount: Math.round(dealBasisAmount * (rate / 100) * 100) / 100 };
  },

  /** Section 25-26 — a rule matches a deal only if EVERY one of its
   *  conditions is satisfied (AND); a rule with zero conditions is a
   *  global fallback that matches everything. Returns active rules
   *  that match, ordered by priority (lower = tried first), so the
   *  caller can present a ranked, admin-chosen list rather than
   *  silently auto-picking one (section 27's "do not automatically
   *  assume a commission basis"). */
  matchingRulesFor(rules: CommissionRule[], deal: Pick<Deal, "propertyId" | "projectId" | "propertyType" | "dealType" | "agentId">): CommissionRule[] {
    return rules
      .filter((r) => r.active)
      .filter((r) => {
        const conditions = r.conditions ?? [];
        if (conditions.length === 0) return true;
        return conditions.every((c) => {
          switch (c.conditionType) {
            case "PROPERTY":
              return c.conditionValue === deal.propertyId;
            case "PROJECT":
              return c.conditionValue === deal.projectId;
            case "PROPERTY_TYPE":
              return c.conditionValue === deal.propertyType;
            case "DEAL_TYPE":
              return c.conditionValue === deal.dealType;
            case "AGENT":
              return c.conditionValue === deal.agentId;
            case "TEAM":
              return false; // no team/grouping concept exists yet on admin_profiles — disclosed limitation
            default:
              return false;
          }
        });
      })
      .sort((a, b) => a.priority - b.priority);
  },
};
