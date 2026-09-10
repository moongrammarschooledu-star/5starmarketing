import type { DealStatus, DealType, CommissionStatus, DealPaymentStatusFilter, DealSortKey } from "./models/deal";
import { allDealStatuses, dealTypes, commissionStatuses } from "./models/deal";
import type { DealSearchFilters } from "./models/deal";
import { DEFAULT_DEAL_PAGE_SIZE, MAX_DEAL_PAGE_SIZE } from "./models/deal";

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

const PAYMENT_STATUS_VALUES: DealPaymentStatusFilter[] = ["unpaid", "partial", "paid"];
const SORT_VALUES: DealSortKey[] = ["newest", "oldest", "value_desc", "value_asc"];

/** Parses /admin/deals' URL into DealSearchFilters — every branch has a
 *  safe fallback, mirroring parseCrmSearchParams (STEP 17). */
export function parseDealSearchParams(sp: RawSearchParams): DealSearchFilters {
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const status = allDealStatuses.includes(one(sp.status) as DealStatus) ? (one(sp.status) as DealStatus) : undefined;
  const dealType = dealTypes.includes(one(sp.type) as DealType) ? (one(sp.type) as DealType) : undefined;
  const agentId = one(sp.agent)?.trim().slice(0, 100) || undefined;
  const propertyId = one(sp.property)?.trim().slice(0, 100) || undefined;
  const projectId = one(sp.project)?.trim().slice(0, 100) || undefined;
  const commissionStatus = commissionStatuses.includes(one(sp.commission) as CommissionStatus) ? (one(sp.commission) as CommissionStatus) : undefined;
  const paymentStatusRaw = one(sp.payment);
  const paymentStatus = PAYMENT_STATUS_VALUES.includes(paymentStatusRaw as DealPaymentStatusFilter) ? (paymentStatusRaw as DealPaymentStatusFilter) : undefined;
  const dateFrom = one(sp.from)?.trim().slice(0, 10) || undefined;
  const dateTo = one(sp.to)?.trim().slice(0, 10) || undefined;
  const sortRaw = one(sp.sort);
  const sort = SORT_VALUES.includes(sortRaw as DealSortKey) ? (sortRaw as DealSortKey) : undefined;

  const page = Math.max(1, num(one(sp.page), { min: 1, max: 100000 }) ?? 1);
  const pageSize = Math.min(MAX_DEAL_PAGE_SIZE, Math.max(1, num(one(sp.page_size), { min: 1, max: MAX_DEAL_PAGE_SIZE }) ?? DEFAULT_DEAL_PAGE_SIZE));

  return { q, status, dealType, agentId, propertyId, projectId, commissionStatus, paymentStatus, dateFrom, dateTo, sort, page, pageSize };
}
