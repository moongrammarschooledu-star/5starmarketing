"use server";

import { revalidatePath } from "next/cache";
import { profileService } from "@/services/profileService";
import { rentAgreementService } from "@/services/rentAgreementService";
import { agreementPrefillService } from "@/services/agreementPrefillService";
import { documentService } from "@/services/documentService";
import { renderRentAgreementPdf } from "@/lib/pdf/rentAgreementPdf";
import { canAccess } from "@/lib/permissions";
import { agreementProblems, normalizeAgreementData, type RentAgreementData } from "@/lib/rentAgreement/types";

async function requireRentals() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) throw new Error("Not authorized.");
  return admin;
}

/** Creates (id = null) or updates a rent agreement. Returns its id. */
export async function saveRentAgreementAction(id: string | null, input: RentAgreementData, links: { leaseId?: string; propertyId?: string }) {
  const admin = await requireRentals();
  const data = normalizeAgreementData(input);
  const problems = agreementProblems(data);
  if (problems.length) throw new Error(problems[0]);
  const record = id ? await rentAgreementService.update(id, data) : await rentAgreementService.create(data, links, admin.id);
  revalidatePath("/admin/rentals/agreements");
  revalidatePath(`/admin/rentals/agreements/${record.id}`);
  return { id: record.id, agreementNo: record.agreementNo };
}

export async function deleteRentAgreementAction(id: string) {
  await requireRentals();
  await rentAgreementService.remove(id);
  revalidatePath("/admin/rentals/agreements");
}

/** Fills the form from one of our own properties (and its owner's saved details). */
export async function prefillAgreementFromPropertyAction(propertyId: string) {
  await requireRentals();
  return (await agreementPrefillService.fromProperty(propertyId)) ?? null;
}

/** Keeps a PDF copy in Documents (type "Rental Agreement"), linked to the lease / property. */
export async function saveAgreementToDocumentsAction(id: string) {
  const admin = await requireRentals();
  const record = await rentAgreementService.getById(id);
  if (!record) throw new Error("Agreement not found.");
  if (record.data.language !== "en") throw new Error("An Urdu agreement is printed from the Print page. Choose Save as PDF there, then upload that PDF in Documents.");
  const bytes = await renderRentAgreementPdf(record.data, record.agreementNo);
  const who = [record.data.tenant.name || record.data.tenant.nameUr, record.data.owner.name || record.data.owner.nameUr].filter(Boolean).join(" - ");
  const doc = await documentService.createGeneratedDocument(
    {
      title: `Rent Agreement ${record.agreementNo}${who ? ` - ${who}` : ""}`,
      documentType: "RENTAL_AGREEMENT",
      leaseId: record.leaseId,
      propertyId: record.propertyId,
      visibility: "ADMIN_ONLY",
      fileName: `rent-agreement-${record.agreementNo}.pdf`,
      bytes,
      mimeType: "application/pdf",
    },
    { adminId: admin.id, name: admin.name }
  );
  await rentAgreementService.setDocumentId(id, doc.id);
  revalidatePath(`/admin/rentals/agreements/${id}`);
  revalidatePath("/admin/documents");
  return { documentId: doc.id };
}
