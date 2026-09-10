import type { DocumentStatus } from "./models/document";
import { documentStatuses, DEFAULT_DOCUMENT_PAGE_SIZE, MAX_DOCUMENT_PAGE_SIZE } from "./models/document";
import type { DocumentSearchFilters } from "./models/document";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function num(v: string | undefined, opts?: { min?: number; max?: number }): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  let clamped = n;
  if (opts?.min !== undefined) clamped = Math.max(opts.min, clamped);
  if (opts?.max !== undefined) clamped = Math.min(opts.max, clamped);
  return clamped;
}

export function parseDocumentSearchParams(sp: RawSearchParams): DocumentSearchFilters {
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const status = documentStatuses.includes(one(sp.status) as DocumentStatus) ? (one(sp.status) as DocumentStatus) : undefined;
  const documentType = one(sp.type)?.trim().slice(0, 100) || undefined;
  const customerId = one(sp.customer)?.trim().slice(0, 100) || undefined;
  const propertyId = one(sp.property)?.trim().slice(0, 100) || undefined;
  const projectId = one(sp.project)?.trim().slice(0, 100) || undefined;
  const dealId = one(sp.deal)?.trim().slice(0, 100) || undefined;
  const agentId = one(sp.agent)?.trim().slice(0, 100) || undefined;
  const dateFrom = one(sp.from)?.trim().slice(0, 10) || undefined;
  const dateTo = one(sp.to)?.trim().slice(0, 10) || undefined;
  const expiringOnly = one(sp.expiring) === "1" ? true : undefined;

  const page = Math.max(1, num(one(sp.page), { min: 1, max: 100000 }) ?? 1);
  const pageSize = Math.min(MAX_DOCUMENT_PAGE_SIZE, Math.max(1, num(one(sp.page_size), { min: 1, max: MAX_DOCUMENT_PAGE_SIZE }) ?? DEFAULT_DOCUMENT_PAGE_SIZE));

  return { q, status, documentType, customerId, propertyId, projectId, dealId, agentId, dateFrom, dateTo, expiringOnly, page, pageSize };
}
