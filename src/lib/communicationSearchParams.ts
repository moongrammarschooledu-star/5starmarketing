import type { ConversationSearchFilters, CommChannel, ConversationPriority, ConversationStatus } from "./models/communication";
import { commChannels, conversationPriorities, DEFAULT_CONVERSATION_PAGE_SIZE, MAX_CONVERSATION_PAGE_SIZE } from "./models/communication";

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

const STATUS_VALUES: ConversationStatus[] = ["OPEN", "CLOSED", "ARCHIVED"];

export function parseConversationSearchParams(sp: RawSearchParams): ConversationSearchFilters {
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const channel = commChannels.includes(one(sp.channel) as CommChannel) ? (one(sp.channel) as CommChannel) : undefined;
  const agentId = one(sp.agent)?.trim().slice(0, 100) || undefined;
  const unassigned = one(sp.unassigned) === "1" ? true : undefined;
  const unmatchedOnly = one(sp.unmatched) === "1" ? true : undefined;
  const priority = conversationPriorities.includes(one(sp.priority) as ConversationPriority) ? (one(sp.priority) as ConversationPriority) : undefined;
  const status = STATUS_VALUES.includes(one(sp.status) as ConversationStatus) ? (one(sp.status) as ConversationStatus) : undefined;
  const dateFrom = one(sp.from)?.trim().slice(0, 10) || undefined;
  const dateTo = one(sp.to)?.trim().slice(0, 10) || undefined;

  const page = Math.max(1, num(one(sp.page), { min: 1, max: 100000 }) ?? 1);
  const pageSize = Math.min(MAX_CONVERSATION_PAGE_SIZE, Math.max(1, num(one(sp.page_size), { min: 1, max: MAX_CONVERSATION_PAGE_SIZE }) ?? DEFAULT_CONVERSATION_PAGE_SIZE));

  return { q, channel, agentId, unassigned, unmatchedOnly, priority, status, dateFrom, dateTo, page, pageSize };
}
