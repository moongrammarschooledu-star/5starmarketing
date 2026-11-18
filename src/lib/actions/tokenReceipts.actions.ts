"use server";

import { revalidatePath } from "next/cache";
import { profileService } from "@/services/profileService";
import { tokenReceiptService } from "@/services/tokenReceiptService";
import { agreementPrefillService } from "@/services/agreementPrefillService";
import { canAccess } from "@/lib/permissions";
import { normalizeTokenData, tokenProblems, type TokenReceiptData } from "@/lib/tokenReceipt/types";

async function requireRentals() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) throw new Error("Not authorized.");
  return admin;
}

/** Creates (id = null) or updates a token receipt. Returns its id and number. */
export async function saveTokenReceiptAction(id: string | null, input: TokenReceiptData, propertyId?: string) {
  const admin = await requireRentals();
  const data = normalizeTokenData(input);
  const problems = tokenProblems(data);
  if (problems.length) throw new Error(problems[0]);
  const record = id ? await tokenReceiptService.update(id, data) : await tokenReceiptService.create(data, propertyId, admin.id);
  revalidatePath("/admin/rentals/tokens");
  revalidatePath(`/admin/rentals/tokens/${record.id}`);
  return { id: record.id, receiptNo: record.receiptNo };
}

export async function deleteTokenReceiptAction(id: string) {
  await requireRentals();
  await tokenReceiptService.remove(id);
  revalidatePath("/admin/rentals/tokens");
}

/** Fills the token form from one of our own properties (and its owner's saved details). */
export async function prefillTokenFromPropertyAction(propertyId: string) {
  await requireRentals();
  const p = await agreementPrefillService.fromProperty(propertyId);
  if (!p) return null;
  return {
    ownerName: p.owner?.name ?? "",
    property: { description: p.property?.description ?? "", area: p.property?.area ?? "", city: p.property?.city ?? "", size: p.property?.size ?? "" },
    agreedAmount: p.monthlyRent ?? 0,
  };
}
