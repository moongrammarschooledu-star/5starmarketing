import type { InventoryUnitType, InventoryStatus, InventorySortKey } from "./models/inventory";
import { inventoryUnitTypes, inventoryStatuses } from "./models/inventory";
import type { InventorySearchFilters } from "./models/inventory";
import { DEFAULT_INVENTORY_PAGE_SIZE, MAX_INVENTORY_PAGE_SIZE } from "./models/inventory";

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

const SORT_VALUES: InventorySortKey[] = ["newest", "oldest", "price_asc", "price_desc", "size_asc", "size_desc", "unit_number"];

export function parseInventorySearchParams(sp: RawSearchParams): InventorySearchFilters {
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const projectId = one(sp.project)?.trim().slice(0, 100) || undefined;
  const propertyId = one(sp.property)?.trim().slice(0, 100) || undefined;
  const unitType = inventoryUnitTypes.includes(one(sp.type) as InventoryUnitType) ? (one(sp.type) as InventoryUnitType) : undefined;
  const block = one(sp.block)?.trim().slice(0, 100) || undefined;
  const building = one(sp.building)?.trim().slice(0, 100) || undefined;
  const floor = one(sp.floor)?.trim().slice(0, 100) || undefined;
  const status = inventoryStatuses.includes(one(sp.status) as InventoryStatus) ? (one(sp.status) as InventoryStatus) : undefined;
  const agentId = one(sp.agent)?.trim().slice(0, 100) || undefined;
  const minPrice = num(one(sp.min_price), { min: 0 });
  const maxPrice = num(one(sp.max_price), { min: 0 });
  const minSize = num(one(sp.min_size), { min: 0 });
  const maxSize = num(one(sp.max_size), { min: 0 });
  const availabilityDateFrom = one(sp.from)?.trim().slice(0, 10) || undefined;
  const availabilityDateTo = one(sp.to)?.trim().slice(0, 10) || undefined;
  const sortRaw = one(sp.sort);
  const sort = SORT_VALUES.includes(sortRaw as InventorySortKey) ? (sortRaw as InventorySortKey) : undefined;

  const page = Math.max(1, num(one(sp.page), { min: 1, max: 100000 }) ?? 1);
  const pageSize = Math.min(MAX_INVENTORY_PAGE_SIZE, Math.max(1, num(one(sp.page_size), { min: 1, max: MAX_INVENTORY_PAGE_SIZE }) ?? DEFAULT_INVENTORY_PAGE_SIZE));

  return { q, projectId, propertyId, unitType, block, building, floor, status, agentId, minPrice, maxPrice, minSize, maxSize, availabilityDateFrom, availabilityDateTo, sort, page, pageSize };
}
