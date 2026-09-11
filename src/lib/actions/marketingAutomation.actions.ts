"use server";

import { revalidatePath } from "next/cache";
import { leadScoringService } from "@/services/leadScoringService";
import { automationService } from "@/services/automationService";
import { followUpRuleService } from "@/services/followUpRuleService";
import { marketingTemplateService } from "@/services/marketingTemplateService";
import { marketingTagService } from "@/services/marketingTagService";
import { marketingSegmentService } from "@/services/marketingSegmentService";
import { profileService } from "@/services/profileService";
import { canAccess, canManageMarketingAutomation } from "@/lib/permissions";
import type { ScoreLevel, ScoringEventType, LeadScoringRuleInput } from "@/lib/models/leadScoring";
import type { MarketingWorkflowInput, WorkflowActionInput, FollowUpRuleInput } from "@/lib/models/automation";
import type { MarketingTemplateInput } from "@/lib/models/marketingTemplate";
import type { MarketingTagInput, MarketingSegmentInput } from "@/lib/models/marketingTag";

async function requireMarketingAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "marketing")) throw new Error("Not authorized.");
  return admin;
}

/** Lead-level actions (scoring a specific lead, tagging it) are CRM
 *  actions, not marketing administration — gated the same way the rest
 *  of the CRM lead-detail page is, so a sales_agent can use them on
 *  their own assigned leads (RLS still scopes the actual row access). */
async function requireLeadAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "leads")) throw new Error("Not authorized.");
  return admin;
}

async function requireMarketingAutomationAccess() {
  const admin = await requireMarketingAccess();
  if (!canManageMarketingAutomation(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateAutomation() {
  revalidatePath("/admin/marketing/automation");
  revalidatePath("/admin/marketing/automation/rules");
  revalidatePath("/admin/marketing/automation/workflows");
}

// ---- Lead Scoring Rules ----

export async function updateScoringRuleAction(id: string, input: Partial<LeadScoringRuleInput>) {
  await requireMarketingAutomationAccess();
  await leadScoringService.updateRule(id, input);
  revalidateAutomation();
}

/** The manual, explicit negative scoring actions (section 12) — never
 *  auto-detected. */
export async function applyManualScoreEventAction(leadId: string, eventType: ScoringEventType, reason?: string) {
  await requireLeadAccess();
  await leadScoringService.applyEvent(leadId, eventType, reason);
  revalidatePath(`/admin/crm/leads/${leadId}`);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function updateSlaRuleAction(scoreLevel: ScoreLevel, responseMinutes: number, active: boolean) {
  await requireMarketingAutomationAccess();
  await leadScoringService.updateSlaRule(scoreLevel, responseMinutes, active);
  revalidateAutomation();
}

// ---- Follow-Up Rules ----

export async function createFollowUpRuleAction(input: FollowUpRuleInput) {
  await requireMarketingAutomationAccess();
  const rule = await followUpRuleService.create(input);
  revalidateAutomation();
  return rule;
}

export async function updateFollowUpRuleAction(id: string, input: Partial<FollowUpRuleInput>) {
  await requireMarketingAutomationAccess();
  await followUpRuleService.update(id, input);
  revalidateAutomation();
}

export async function removeFollowUpRuleAction(id: string) {
  await requireMarketingAutomationAccess();
  await followUpRuleService.remove(id);
  revalidateAutomation();
}

// ---- Workflows ----

export async function createWorkflowAction(input: MarketingWorkflowInput) {
  const admin = await requireMarketingAutomationAccess();
  const workflow = await automationService.createWorkflow(input, admin.id);
  revalidateAutomation();
  return workflow;
}

export async function updateWorkflowAction(id: string, input: Partial<MarketingWorkflowInput>) {
  await requireMarketingAutomationAccess();
  await automationService.updateWorkflow(id, input);
  revalidateAutomation();
}

export async function removeWorkflowAction(id: string) {
  await requireMarketingAutomationAccess();
  await automationService.removeWorkflow(id);
  revalidateAutomation();
}

export async function addWorkflowActionAction(workflowId: string, input: WorkflowActionInput) {
  await requireMarketingAutomationAccess();
  const action = await automationService.addAction(workflowId, input);
  revalidateAutomation();
  return action;
}

export async function removeWorkflowActionAction(id: string, workflowId: string) {
  await requireMarketingAutomationAccess();
  await automationService.removeAction(id);
  revalidatePath(`/admin/marketing/automation/workflows/${workflowId}`);
  revalidateAutomation();
}

// ---- Templates ----

export async function createMarketingTemplateAction(input: MarketingTemplateInput) {
  const admin = await requireMarketingAutomationAccess();
  const template = await marketingTemplateService.create(input, admin.id);
  revalidatePath("/admin/marketing/templates");
  return template;
}

export async function updateMarketingTemplateAction(id: string, input: Partial<MarketingTemplateInput>) {
  const admin = await requireMarketingAutomationAccess();
  await marketingTemplateService.update(id, input, admin.id);
  revalidatePath("/admin/marketing/templates");
}

export async function duplicateMarketingTemplateAction(id: string) {
  const admin = await requireMarketingAutomationAccess();
  const template = await marketingTemplateService.duplicate(id, admin.id);
  revalidatePath("/admin/marketing/templates");
  return template;
}

export async function setMarketingTemplateActiveAction(id: string, active: boolean) {
  await requireMarketingAutomationAccess();
  await marketingTemplateService.setActive(id, active);
  revalidatePath("/admin/marketing/templates");
}

// ---- Tags ----

export async function createTagAction(input: MarketingTagInput) {
  await requireMarketingAccess();
  const tag = await marketingTagService.create(input);
  revalidatePath("/admin/marketing/audience");
  return tag;
}

export async function removeTagAction(id: string) {
  await requireMarketingAutomationAccess();
  await marketingTagService.remove(id);
  revalidatePath("/admin/marketing/audience");
}

export async function addTagToLeadAction(leadId: string, tagId: string) {
  await requireLeadAccess();
  await marketingTagService.addToLead(leadId, tagId);
  revalidatePath(`/admin/crm/leads/${leadId}`);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function removeTagFromLeadAction(leadId: string, tagId: string) {
  await requireLeadAccess();
  await marketingTagService.removeFromLead(leadId, tagId);
  revalidatePath(`/admin/crm/leads/${leadId}`);
  revalidatePath(`/admin/leads/${leadId}`);
}

// ---- Segments ----

export async function createSegmentAction(input: MarketingSegmentInput) {
  const admin = await requireMarketingAccess();
  const segment = await marketingSegmentService.create(input, admin.id);
  revalidatePath("/admin/marketing/audience");
  return segment;
}

export async function updateSegmentAction(id: string, input: Partial<MarketingSegmentInput>) {
  await requireMarketingAccess();
  await marketingSegmentService.update(id, input);
  revalidatePath("/admin/marketing/audience");
}

export async function removeSegmentAction(id: string) {
  await requireMarketingAccess();
  await marketingSegmentService.remove(id);
  revalidatePath("/admin/marketing/audience");
}

/** Resolves a segment against LIVE lead data on demand (sections 29-30)
 *  — never a stored, potentially-stale membership list. */
export async function previewSegmentAction(segmentId: string) {
  await requireMarketingAccess();
  const segment = await marketingSegmentService.getById(segmentId);
  if (!segment) return [];
  const leads = await marketingSegmentService.resolve(segment, 50);
  return leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, status: l.status, score: l.score, scoreLevel: l.scoreLevel }));
}
