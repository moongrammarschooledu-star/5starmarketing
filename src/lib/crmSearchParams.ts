import type { LeadStatus, LeadPriority, LeadSource, LeadType, LeadPurpose } from "./models/lead";
import { leadStatuses, leadPriorities, leadSources, leadTypes, leadPurposes } from "./models/lead";
import type { LeadSearchFilters, FollowUpDueFilter } from "./models/crm";
import { DEFAULT_LEAD_PAGE_SIZE, MAX_LEAD_PAGE_SIZE } from "./models/crm";
import type { ScoreLevel } from "./models/leadScoring";
import { scoreLevels } from "./models/leadScoring";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function num(v: string | undefined, opts?: { min?: number; max?: number }): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return undefined;
  let clamped = n;
  if (opts?.min !== undefined) clamped = Math.max(opts.min, clamped);
  if (opts?.max !== undefined) clamped = Math.min(opts.max, clamped);
  return clamped;
}

const FOLLOW_UP_DUE_VALUES: FollowUpDueFilter[] = ["overdue", "today", "upcoming", "none"];

/** Parses /admin/crm/leads' URL into LeadSearchFilters — every branch has
 *  a safe fallback, an internal/admin-only equivalent of
 *  parsePropertySearchParams (STEP 16). Invalid or attacker-crafted
 *  values just drop that one filter rather than crashing the page; RLS
 *  still governs what the query can actually return regardless. */
export function parseCrmSearchParams(sp: RawSearchParams): LeadSearchFilters {
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const status = leadStatuses.includes(one(sp.status) as LeadStatus) ? (one(sp.status) as LeadStatus) : undefined;
  const priority = leadPriorities.includes(one(sp.priority) as LeadPriority) ? (one(sp.priority) as LeadPriority) : undefined;
  const source = leadSources.includes(one(sp.source) as LeadSource) ? (one(sp.source) as LeadSource) : undefined;
  const leadType = leadTypes.includes(one(sp.type) as LeadType) ? (one(sp.type) as LeadType) : undefined;
  const purpose = leadPurposes.includes(one(sp.purpose) as LeadPurpose) ? (one(sp.purpose) as LeadPurpose) : undefined;
  const agentId = one(sp.agent)?.trim().slice(0, 100) || undefined;
  const unassigned = one(sp.unassigned) === "1" ? true : undefined;
  const campaignId = one(sp.campaign)?.trim().slice(0, 100) || undefined;
  const propertyId = one(sp.property)?.trim().slice(0, 100) || undefined;
  const projectId = one(sp.project)?.trim().slice(0, 100) || undefined;
  const propertyType = one(sp.property_type)?.trim().slice(0, 100) || undefined;
  const followUpDueRaw = one(sp.follow_up);
  const followUpDue = FOLLOW_UP_DUE_VALUES.includes(followUpDueRaw as FollowUpDueFilter) ? (followUpDueRaw as FollowUpDueFilter) : undefined;
  const dateFrom = one(sp.from)?.trim().slice(0, 10) || undefined;
  const dateTo = one(sp.to)?.trim().slice(0, 10) || undefined;
  const scoreLevel = scoreLevels.includes(one(sp.score_level) as ScoreLevel) ? (one(sp.score_level) as ScoreLevel) : undefined;
  const tagId = one(sp.tag)?.trim().slice(0, 100) || undefined;

  const page = Math.max(1, num(one(sp.page), { min: 1, max: 100000 }) ?? 1);
  const pageSize = Math.min(MAX_LEAD_PAGE_SIZE, Math.max(1, num(one(sp.page_size), { min: 1, max: MAX_LEAD_PAGE_SIZE }) ?? DEFAULT_LEAD_PAGE_SIZE));

  return { q, status, priority, source, leadType, purpose, agentId, unassigned, campaignId, propertyId, projectId, propertyType, followUpDue, dateFrom, dateTo, scoreLevel, tagId, page, pageSize };
}

/** Inverse of parseCrmSearchParams — used for pagination links and CSV
 *  export so filters stay in sync with the on-screen list. */
export function buildCrmSearchQuery(filters: LeadSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.source) params.set("source", filters.source);
  if (filters.leadType) params.set("type", filters.leadType);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.agentId) params.set("agent", filters.agentId);
  if (filters.unassigned) params.set("unassigned", "1");
  if (filters.campaignId) params.set("campaign", filters.campaignId);
  if (filters.propertyId) params.set("property", filters.propertyId);
  if (filters.projectId) params.set("project", filters.projectId);
  if (filters.propertyType) params.set("property_type", filters.propertyType);
  if (filters.followUpDue) params.set("follow_up", filters.followUpDue);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.scoreLevel) params.set("score_level", filters.scoreLevel);
  if (filters.tagId) params.set("tag", filters.tagId);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}
