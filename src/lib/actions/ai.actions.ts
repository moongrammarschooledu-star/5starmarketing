"use server";

import { revalidatePath } from "next/cache";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { aiConversationService } from "@/services/aiConversationService";
import { aiConfigService } from "@/services/aiConfigService";
import { aiActionRequestService } from "@/services/aiActionRequestService";
import { aiAuditService } from "@/services/aiAuditService";
import { aiInsightService } from "@/services/aiInsightService";
import { aiKnowledgeService } from "@/services/aiKnowledgeService";
import { aiAutomationService } from "@/services/aiAutomationService";
import { canAccess, canManageAiSettings, assistantSectionFor } from "@/lib/permissions";
import type { AssistantType, AiKnowledgeSource, AiAutomationRule } from "@/lib/models/ai";

async function requireAdmin() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) throw new Error("Not authorized.");
  return admin;
}

async function requireAiSettingsAccess() {
  const admin = await requireAdmin();
  if (!canManageAiSettings(admin.role)) throw new Error("Not authorized for AI settings.");
  return admin;
}

async function requireAssistantAccess(assistantType: AssistantType) {
  const admin = await requireAdmin();
  if (!canAccess(admin.role, assistantSectionFor(assistantType))) throw new Error("Not authorized for this assistant.");
  return admin;
}

// ---- Conversations (admin) ----
export async function listMyAiConversationsAction(assistantType?: AssistantType) {
  const admin = await requireAdmin();
  const all = await aiConversationService.listForOwner({ adminId: admin.id });
  return assistantType ? all.filter((c) => c.assistantType === assistantType) : all;
}

export async function createAiConversationAction(assistantType: AssistantType, title?: string) {
  await requireAssistantAccess(assistantType);
  const admin = await requireAdmin();
  const conversation = await aiConversationService.create(assistantType, { adminId: admin.id }, title);
  revalidatePath("/admin/ai/chat");
  return conversation;
}

export async function getAiConversationMessagesAction(conversationId: string) {
  const admin = await requireAdmin();
  const conversation = await aiConversationService.getById(conversationId);
  if (!conversation || conversation.adminId !== admin.id) throw new Error("Not found.");
  return aiConversationService.listMessages(conversationId);
}

export async function renameAiConversationAction(conversationId: string, title: string) {
  const admin = await requireAdmin();
  const conversation = await aiConversationService.getById(conversationId);
  if (!conversation || conversation.adminId !== admin.id) throw new Error("Not found.");
  await aiConversationService.rename(conversationId, title);
  revalidatePath("/admin/ai/chat");
}

export async function archiveAiConversationAction(conversationId: string, archived: boolean) {
  const admin = await requireAdmin();
  const conversation = await aiConversationService.getById(conversationId);
  if (!conversation || conversation.adminId !== admin.id) throw new Error("Not found.");
  await aiConversationService.archive(conversationId, archived);
  revalidatePath("/admin/ai/chat");
}

export async function setAiMessageFeedbackAction(messageId: string, feedback: "up" | "down" | null) {
  await requireAdmin();
  await aiConversationService.setFeedback(messageId, feedback);
}

// ---- Conversations (customer portal) ----
export async function listMyPortalAiConversationsAction() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not authorized.");
  return aiConversationService.listForOwner({ customerId: customer.id });
}

export async function createPortalAiConversationAction(title?: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not authorized.");
  return aiConversationService.create("CUSTOMER_PORTAL", { customerId: customer.id }, title);
}

export async function getPortalAiConversationMessagesAction(conversationId: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not authorized.");
  const conversation = await aiConversationService.getById(conversationId);
  if (!conversation || conversation.customerId !== customer.id) throw new Error("Not found.");
  return aiConversationService.listMessages(conversationId);
}

// ---- AI Settings (admin/manager only) ----
export async function listAiAssistantConfigsAction() {
  await requireAiSettingsAccess();
  return aiConfigService.listAll();
}

export async function updateAiAssistantConfigAction(
  assistantType: AssistantType | "GLOBAL",
  input: Parameters<typeof aiConfigService.update>[1]
) {
  const admin = await requireAiSettingsAccess();
  await aiConfigService.update(assistantType, input, admin.id);
  revalidatePath("/admin/ai/settings");
}

// ---- Human-approval queue ----
export async function listAiActionRequestsAction(status?: string) {
  await requireAdmin();
  return aiActionRequestService.list(status ? { status } : undefined);
}

export async function reviewAiActionRequestAction(id: string, decision: "APPROVED" | "REJECTED", notes?: string) {
  const admin = await requireAdmin();
  const result = await aiActionRequestService.review(id, decision, admin.id, notes);
  revalidatePath("/admin/ai/activity");
  return result;
}

// ---- Audit / usage (activity log) ----
export async function listAiToolLogsAction(filters?: { toolName?: string; status?: string }) {
  await requireAdmin();
  return aiAuditService.listToolLogs(filters);
}

export async function getAiUsageSummaryAction(days = 30) {
  await requireAdmin();
  return aiAuditService.usageSummary(days);
}

// ---- Smart Insights ----
export async function regenerateAiInsightsAction() {
  await requireAiSettingsAccess();
  const count = await aiInsightService.regenerate();
  revalidatePath("/admin/ai/insights");
  return count;
}

export async function acknowledgeAiInsightAction(id: string, status: "ACKNOWLEDGED" | "DISMISSED") {
  const admin = await requireAdmin();
  await aiInsightService.acknowledge(id, admin.id, status);
  revalidatePath("/admin/ai/insights");
}

// ---- Knowledge Sources ----
export async function listAiKnowledgeSourcesAction() {
  await requireAdmin();
  return aiKnowledgeService.listAll();
}

export async function createAiKnowledgeSourceAction(
  input: Pick<AiKnowledgeSource, "title" | "content" | "sourceType" | "department" | "visibility" | "isPublished">
) {
  const admin = await requireAiSettingsAccess();
  const source = await aiKnowledgeService.create(input, admin.id);
  revalidatePath("/admin/ai/knowledge");
  return source;
}

export async function updateAiKnowledgeSourceAction(id: string, input: Partial<AiKnowledgeSource>) {
  await requireAiSettingsAccess();
  await aiKnowledgeService.update(id, input);
  revalidatePath("/admin/ai/knowledge");
}

export async function deleteAiKnowledgeSourceAction(id: string) {
  await requireAiSettingsAccess();
  await aiKnowledgeService.remove(id);
  revalidatePath("/admin/ai/knowledge");
}

// ---- Automation rules ----
export async function listAiAutomationRulesAction() {
  await requireAdmin();
  return aiAutomationService.listRules();
}

export async function createAiAutomationRuleAction(input: Omit<AiAutomationRule, "id" | "createdAt">) {
  const admin = await requireAiSettingsAccess();
  const rule = await aiAutomationService.createRule(input, admin.id);
  revalidatePath("/admin/ai/automations");
  return rule;
}

export async function setAiAutomationRuleEnabledAction(id: string, isEnabled: boolean) {
  await requireAiSettingsAccess();
  await aiAutomationService.setEnabled(id, isEnabled);
  revalidatePath("/admin/ai/automations");
}

export async function listAiAutomationRunsAction(ruleId?: string) {
  await requireAdmin();
  return aiAutomationService.listRuns(ruleId);
}
