"use server";

import { documentService } from "@/services/documentService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";

/** Small helper for the legal module's contract form — lets it pick an
 *  already-uploaded document to wrap, without duplicating the document
 *  vault's own listing UI. */
export async function listPropertyDocumentsAction(propertyId: string): Promise<{ id: string; title: string }[]> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "legal")) throw new Error("Not authorized.");
  const documents = await documentService.listByProperty(propertyId);
  return documents.map((d) => ({ id: d.id, title: `${d.title} (${d.documentType})` }));
}
