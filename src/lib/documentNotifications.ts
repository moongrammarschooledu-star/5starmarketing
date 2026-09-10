import "server-only";
import { notificationService } from "@/services/notificationService";

/** Reusable, named notification functions for the documents system
 *  (section 62) — each wraps notificationService.notify with a
 *  consistent title/message so callers never hand-roll ad-hoc copy. */

export async function notifyDocumentRequired(customerId: string, documentTypeLabel: string, documentId?: string) {
  await notificationService.notify(customerId, "document_required", "Document required", `Please upload: ${documentTypeLabel}.`, "document", documentId);
}

export async function notifyDocumentApproved(customerId: string, documentTitle: string, documentId: string) {
  await notificationService.notify(customerId, "document_approved", "Document approved", `${documentTitle} has been approved.`, "document", documentId);
}

export async function notifyDocumentRejected(customerId: string, documentTitle: string, reason: string, documentId: string) {
  await notificationService.notify(customerId, "document_rejected", "Document rejected", `${documentTitle}: ${reason}`, "document", documentId);
}

export async function notifySignatureRequired(customerId: string, documentTitle: string, documentId: string) {
  await notificationService.notify(customerId, "signature_required", "Signature requested", `Please review and sign: ${documentTitle}.`, "document", documentId);
}

export async function notifySignatureCompleted(customerId: string, documentTitle: string, documentId: string) {
  await notificationService.notify(customerId, "agreement_signed", "Agreement signed", `${documentTitle} has been fully signed.`, "document", documentId);
}

export async function notifyDocumentExpiring(customerId: string, documentTitle: string, documentId: string) {
  await notificationService.notify(customerId, "document_expiring", "Document expiring soon", `${documentTitle} is approaching its expiry date.`, "document", documentId);
}
