"use server";

import { revalidatePath } from "next/cache";
import { profileService } from "@/services/profileService";
import { saleAgreementService } from "@/services/saleAgreementService";
import { agreementPrefillService } from "@/services/agreementPrefillService";
import { canAccess } from "@/lib/permissions";
import { normalizeSaleData, saleProblems, type SaleAgreementData } from "@/lib/saleAgreement/types";

async function requireDeals() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "deals")) throw new Error("Not authorized.");
  return admin;
}

/** Creates (id = null) or updates a sale agreement. Returns its id and number. */
export async function saveSaleAgreementAction(id: string | null, input: SaleAgreementData, propertyId?: string) {
  const admin = await requireDeals();
  const data = normalizeSaleData(input);
  const problems = saleProblems(data);
  if (problems.length) throw new Error(problems[0]);
  const record = id ? await saleAgreementService.update(id, data) : await saleAgreementService.create(data, propertyId, admin.id);
  revalidatePath("/admin/deals/sale-agreements");
  revalidatePath(`/admin/deals/sale-agreements/${record.id}`);
  return { id: record.id, agreementNo: record.agreementNo };
}

export async function deleteSaleAgreementAction(id: string) {
  await requireDeals();
  await saleAgreementService.remove(id);
  revalidatePath("/admin/deals/sale-agreements");
}

/** Fills the form from one of our own properties (seller = its owner, price). */
export async function prefillSaleFromPropertyAction(propertyId: string) {
  await requireDeals();
  return (await agreementPrefillService.saleFromProperty(propertyId)) ?? null;
}
