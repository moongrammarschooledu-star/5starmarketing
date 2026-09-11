export type ScoreLevel = "COLD" | "WARM" | "HOT" | "VERY_HOT";
export const scoreLevels: ScoreLevel[] = ["COLD", "WARM", "HOT", "VERY_HOT"];

export const scoreLevelLabels: Record<ScoreLevel, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
  VERY_HOT: "Very Hot",
};

/** Every scoring event this deployment can actually detect (sections
 *  10-13) — positive events are applied automatically at lead creation
 *  (see the apply_lead_signals DB trigger) or via leadScoringService
 *  .applyEvent() for later lifecycle events (deal created/completed).
 *  Negative events are always an explicit admin/agent action — never
 *  auto-detected, since "unreachable"/"spam" is a judgment call. */
export type ScoringEventType =
  | "NEW_LEAD"
  | "PHONE_PROVIDED"
  | "WHATSAPP_INQUIRY"
  | "BUDGET_PROVIDED"
  | "SITE_VISIT_REQUESTED"
  | "BROCHURE_DOWNLOADED"
  | "PAYMENT_PLAN_REQUESTED"
  | "INVESTMENT_CALCULATOR_USED"
  | "MULTIPLE_PROPERTY_VIEWS"
  | "RETURN_VISITOR"
  | "DEAL_CREATED"
  | "DEAL_COMPLETED"
  | "INVALID_CONTACT"
  | "UNREACHABLE"
  | "NOT_INTERESTED"
  | "DUPLICATE_LEAD"
  | "SPAM";

export const scoringEventTypes: ScoringEventType[] = [
  "NEW_LEAD",
  "PHONE_PROVIDED",
  "WHATSAPP_INQUIRY",
  "BUDGET_PROVIDED",
  "SITE_VISIT_REQUESTED",
  "BROCHURE_DOWNLOADED",
  "PAYMENT_PLAN_REQUESTED",
  "INVESTMENT_CALCULATOR_USED",
  "MULTIPLE_PROPERTY_VIEWS",
  "RETURN_VISITOR",
  "DEAL_CREATED",
  "DEAL_COMPLETED",
  "INVALID_CONTACT",
  "UNREACHABLE",
  "NOT_INTERESTED",
  "DUPLICATE_LEAD",
  "SPAM",
];

/** The negative/manual-only events surfaced as explicit agent actions on
 *  a lead (section 12) — the positive ones only ever fire from real code
 *  paths (lead creation, deal lifecycle), never a manual button. */
export const manualNegativeScoringEvents: ScoringEventType[] = ["INVALID_CONTACT", "UNREACHABLE", "NOT_INTERESTED", "DUPLICATE_LEAD", "SPAM"];

export interface LeadScoringRule {
  id: string;
  eventType: ScoringEventType;
  label: string;
  points: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LeadScoringRuleInput = Pick<LeadScoringRule, "label" | "points" | "active">;

export interface LeadScoreHistoryEntry {
  id: string;
  leadId: string;
  ruleId?: string;
  ruleLabel?: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface LeadSlaRule {
  scoreLevel: ScoreLevel;
  responseMinutes: number;
  active: boolean;
}

/** SLA status computed live for one lead (section 42) — never stored;
 *  see leadScoringService.checkSla(). */
export interface LeadSlaStatus {
  applicable: boolean;
  limitMinutes: number;
  elapsedMinutes: number;
  breached: boolean;
  respondedAt?: string;
}
