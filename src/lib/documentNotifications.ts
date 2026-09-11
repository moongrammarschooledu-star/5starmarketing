import "server-only";
import { notificationService } from "@/services/notificationService";
import { dispatchTransactionalMessage } from "@/lib/communication/dispatchToCustomer";

/** Reusable, named notification functions for the documents system
 *  (section 62) — each wraps notificationService.notify with a
 *  consistent title/message so callers never hand-roll ad-hoc copy.
 *  Since STEP 22, each also attempts a real WhatsApp/Email dispatch
 *  through the Communication Center (best-effort — the in-app
 *  notification above is the guaranteed delivery path regardless). */

export async function notifyDocumentRequired(customerId: string, documentTypeLabel: string, documentId?: string) {
  const message = `Please upload: ${documentTypeLabel}.`;
  await notificationService.notify(customerId, "document_required", "Document required", message, "document", documentId);
  await dispatchTransactionalMessage(customerId, "Document required", message);
}

export async function notifyDocumentApproved(customerId: string, documentTitle: string, documentId: string) {
  const message = `${documentTitle} has been approved.`;
  await notificationService.notify(customerId, "document_approved", "Document approved", message, "document", documentId);
  await dispatchTransactionalMessage(customerId, "Document approved", message);
}

export async function notifyDocumentRejected(customerId: string, documentTitle: string, reason: string, documentId: string) {
  const message = `${documentTitle}: ${reason}`;
  await notificationService.notify(customerId, "document_rejected", "Document rejected", message, "document", documentId);
  await dispatchTransactionalMessage(customerId, "Document rejected", message);
}

export async function notifySignatureRequired(customerId: string, documentTitle: string, documentId: string) {
  const message = `Please review and sign: ${documentTitle}.`;
  await notificationService.notify(customerId, "signature_required", "Signature requested", message, "document", documentId);
  await dispatchTransactionalMessage(customerId, "Signature requested", message);
}

export async function notifySignatureCompleted(customerId: string, documentTitle: string, documentId: string) {
  const message = `${documentTitle} has been fully signed.`;
  await notificationService.notify(customerId, "agreement_signed", "Agreement signed", message, "document", documentId);
  await dispatchTransactionalMessage(customerId, "Agreement signed", message);
}

export async function notifyDocumentExpiring(customerId: string, documentTitle: string, documentId: string) {
  const message = `${documentTitle} is approaching its expiry date.`;
  await notificationService.notify(customerId, "document_expiring", "Document expiring soon", message, "document", documentId);
  await dispatchTransactionalMessage(customerId, "Document expiring soon", message);
}
