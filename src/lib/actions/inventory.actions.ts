"use server";

import { revalidatePath } from "next/cache";
import { inventoryService } from "@/services/inventoryService";
import { projectService } from "@/services/projectService";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { staffNotificationService } from "@/services/staffNotificationService";
import { notificationService } from "@/services/notificationService";
import { canAccess, canManageDealFinancials } from "@/lib/permissions";
import type { InventoryInput, InventoryStatus, ReleaseReason } from "@/lib/models/inventory";
import { parseInventoryImportCsv, validateInventoryImportRows } from "@/lib/inventoryImport";

async function requireInventoryAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "inventory")) throw new Error("Not authorized.");
  return admin;
}

async function requireInventoryFinancialAccess() {
  const admin = await requireInventoryAccess();
  // Price/bulk-import/bulk-update reuse the same financial-tier gate as
  // Deals (super_admin/admin/sales_manager) — same role boundary, one
  // shared helper rather than a duplicate.
  if (!canManageDealFinancials(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateUnit(id: string) {
  revalidatePath(`/admin/inventory/${id}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/projects");
}

export async function createInventoryUnitAction(input: InventoryInput) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.create(input, admin.id);
  await activityService.log("Inventory Created", `${unit.unitNumber} created by ${admin.name}`, "inventory", unit.id);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/projects");
  return unit;
}

export async function updateInventoryUnitAction(id: string, input: Partial<InventoryInput>) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.update(id, input);
  if (unit) await activityService.log("Inventory Updated", `${unit.unitNumber} updated by ${admin.name}`, "inventory", id);
  revalidateUnit(id);
  return unit;
}

export async function updateInventoryPriceAction(id: string, newPrice: number, reason?: string) {
  const admin = await requireInventoryFinancialAccess();
  const unit = await inventoryService.updatePrice(id, newPrice, reason, admin.id);
  if (unit) await activityService.log("Price Changed", `${unit.unitNumber} price updated by ${admin.name}`, "inventory", id, { newPrice, reason });
  revalidateUnit(id);
  return unit;
}

export async function addInventoryNoteAction(id: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return;
  const admin = await requireInventoryAccess();
  await inventoryService.addNote(id, trimmed, admin.name, admin.id);
  revalidateUnit(id);
}

export async function reserveInventoryAction(id: string, input: { customerId?: string; leadId?: string; agentId?: string; reservedUntil?: string }) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.reserve(id, input, admin.id);
  await activityService.log("Inventory Reserved", `${unit.unitNumber} reserved by ${admin.name}`, "inventory", id, input);
  if (input.agentId && input.agentId !== admin.id) {
    await staffNotificationService.notify(input.agentId, "inventory_reserved", "Inventory reserved for you", `${unit.unitNumber} was reserved and assigned to you.`, "inventory", id);
  }
  revalidateUnit(id);
  return unit;
}

export async function releaseInventoryAction(id: string, reason: ReleaseReason) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.release(id, reason, admin.id);
  await activityService.log("Reservation Released", `${unit.unitNumber} released by ${admin.name} — ${reason}`, "inventory", id, { reason });
  revalidateUnit(id);
  return unit;
}

export async function markInventoryBookedAction(id: string, dealId?: string) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.markBooked(id, dealId, admin.id);
  await activityService.log("Inventory Booked", `${unit.unitNumber} marked booked by ${admin.name}`, "inventory", id);
  revalidateUnit(id);
  return unit;
}

export async function markInventorySoldAction(id: string) {
  const admin = await requireInventoryFinancialAccess();
  const unit = await inventoryService.markSold(id, admin.id);
  await activityService.log("Inventory Sold", `${unit.unitNumber} marked sold by ${admin.name}`, "inventory", id);
  if (unit.customerId) {
    await notificationService.notify(unit.customerId, "deal_status_updated", "Congratulations!", `${unit.unitNumber} has been marked as sold.`, "inventory", id);
  }
  revalidateUnit(id);
  return unit;
}

export async function markInventoryRentedAction(id: string) {
  const admin = await requireInventoryFinancialAccess();
  const unit = await inventoryService.markRented(id, admin.id);
  await activityService.log("Inventory Rented", `${unit.unitNumber} marked rented by ${admin.name}`, "inventory", id);
  revalidateUnit(id);
  return unit;
}

export async function blockInventoryAction(id: string, reason: string) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.block(id, reason, admin.id);
  await activityService.log("Inventory Blocked", `${unit.unitNumber} blocked by ${admin.name} — ${reason}`, "inventory", id, { reason });
  revalidateUnit(id);
  return unit;
}

export async function unblockInventoryAction(id: string) {
  const admin = await requireInventoryAccess();
  const unit = await inventoryService.unblock(id, admin.id);
  await activityService.log("Inventory Updated", `${unit.unitNumber} unblocked by ${admin.name}`, "inventory", id);
  revalidateUnit(id);
  return unit;
}

export async function setInventoryLifecycleAction(id: string, kind: "under_construction" | "coming_soon" | "available") {
  const admin = await requireInventoryAccess();
  const unit =
    kind === "under_construction"
      ? await inventoryService.setUnderConstruction(id, admin.id)
      : kind === "coming_soon"
        ? await inventoryService.setComingSoon(id, admin.id)
        : await inventoryService.setAvailable(id, admin.id);
  await activityService.log("Status Changed", `${unit.unitNumber} set to ${unit.status} by ${admin.name}`, "inventory", id);
  revalidateUnit(id);
  return unit;
}

export async function archiveInventoryAction(id: string) {
  const admin = await requireInventoryAccess();
  await inventoryService.archive(id, admin.id);
  revalidateUnit(id);
  revalidatePath("/admin/inventory");
}

export async function unarchiveInventoryAction(id: string) {
  await requireInventoryAccess();
  await inventoryService.unarchive(id);
  revalidateUnit(id);
}

export async function bulkUpdateInventoryStatusAction(ids: string[], status: InventoryStatus, reason?: string) {
  const admin = await requireInventoryFinancialAccess();
  const result = await inventoryService.bulkUpdateStatus(ids, status, reason, admin.id);
  await activityService.log("Bulk Updated", `${admin.name} bulk-updated ${result.succeeded.length} unit(s) to ${status}`, "inventory", undefined, {
    succeeded: result.succeeded.length,
    failed: result.failed.length,
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/projects");
  return result;
}

/** Preview step (section 25) — never writes to the database. Resolves
 *  each row's "Project" text to a real project_id (never invents one)
 *  and checks for duplicates against both the CSV itself and existing
 *  inventory, so the admin sees Valid/Invalid/Duplicate counts before
 *  anything is imported. */
export async function previewInventoryImportAction(csvText: string) {
  await requireInventoryFinancialAccess();
  const { rows, headerError } = parseInventoryImportCsv(csvText);
  if (headerError) throw new Error(headerError);

  const [projects, existingUnitKeys] = await Promise.all([projectService.list(), inventoryService.listExistingUnitKeys()]);
  const projectsByName = new Map(projects.map((p) => [p.name.trim().toLowerCase(), p.id]));

  return validateInventoryImportRows(rows, projectsByName, existingUnitKeys);
}

export async function bulkImportInventoryAction(
  rows: { unitNumber: string; unitType: string; projectId?: string; block?: string; building?: string; floor?: string; area?: number; areaUnit?: string; price?: number; status?: string }[]
) {
  const admin = await requireInventoryFinancialAccess();
  const count = await inventoryService.bulkImport(rows, admin.id);
  await activityService.log("Bulk Updated", `${admin.name} imported ${count} inventory unit(s)`, "inventory", undefined, { count });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/projects");
  return count;
}
