import "server-only";
import { createClient } from "@/lib/supabase/server";
import { activityService } from "./activityService";
import type { DocumentSignatureRequest, SignatureParticipant, SignatureParticipantInput, SigningOrderMode, SignatureMethod } from "@/lib/models/document";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRequest(row: any): DocumentSignatureRequest {
  return {
    id: row.id,
    documentId: row.document_id,
    documentVersion: row.document_version,
    status: row.status,
    signingOrderMode: row.signing_order_mode,
    expiresAt: row.expires_at ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    documentTitle: row.documents?.title ?? undefined,
    documentNumber: row.documents?.document_number ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapParticipant(row: any): SignatureParticipant {
  return {
    id: row.id,
    signatureId: row.signature_id,
    participantType: row.participant_type,
    participantName: row.participant_name,
    participantEmail: row.participant_email ?? undefined,
    customerId: row.customer_id ?? undefined,
    adminId: row.admin_id ?? undefined,
    signOrder: row.sign_order,
    status: row.status,
    signedAt: row.signed_at ?? undefined,
    signatureMethod: row.signature_method ?? undefined,
    signatureData: row.signature_data ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    userAgent: row.user_agent ?? undefined,
    createdAt: row.created_at,
  };
}

/** Digital-signature FOUNDATION (sections 20-31, 67) — this records
 *  who reviewed and attested to a document, with a full audit trail
 *  (timestamp, IP, user agent, method). It is explicitly NOT a legally
 *  binding e-signature provider — every UI surface that uses this must
 *  say so; see the disclaimer text exported alongside this service. */
export const LEGAL_DISCLAIMER =
  "This is a digital signature record for internal tracking, not a legally binding electronic signature. Legal validity depends on applicable Pakistani law, the type of agreement, identity verification, and whether a compliant e-sign provider is configured — none is configured in this deployment.";

export const documentSignatureService = {
  async createRequest(
    documentId: string,
    documentVersion: number,
    participants: SignatureParticipantInput[],
    options: { signingOrderMode?: SigningOrderMode; expiresInDays?: number },
    actorId?: string
  ): Promise<DocumentSignatureRequest> {
    if (participants.length === 0) throw new Error("At least one signature participant is required.");
    const supabase = await createClient();
    const expiresAt = options.expiresInDays ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data: request, error } = await supabase
      .from("document_signatures")
      .insert({ document_id: documentId, document_version: documentVersion, signing_order_mode: options.signingOrderMode ?? "Sequential", expires_at: expiresAt, created_by: actorId || null })
      .select("*, documents(title, document_number)")
      .single();
    if (error) {
      console.error("documentSignatureService.createRequest failed:", error);
      throw new Error("Could not create this signature request.");
    }

    const { error: participantsError } = await supabase.from("document_signature_participants").insert(
      participants.map((p) => ({
        signature_id: request.id,
        participant_type: p.participantType,
        participant_name: p.participantName,
        participant_email: p.participantEmail || null,
        customer_id: p.customerId || null,
        admin_id: p.adminId || null,
        sign_order: p.signOrder,
      }))
    );
    if (participantsError) {
      console.error("documentSignatureService.createRequest (participants) failed:", participantsError);
      throw new Error("Could not add signature participants.");
    }

    await activityService.log("Signature Requested", `Signature request created for document ${request.documents?.document_number ?? documentId}`, "document", documentId);
    return mapRequest(request);
  },

  async getById(id: string): Promise<DocumentSignatureRequest | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_signatures").select("*, documents(title, document_number)").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRequest(data);
  },

  async listByDocument(documentId: string): Promise<DocumentSignatureRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_signatures").select("*, documents(title, document_number)").eq("document_id", documentId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRequest);
  },

  /** All pending signature requests where the current customer is a
   *  participant (customer portal "Sign" queue). */
  async listPendingForCustomer(customerId: string): Promise<{ request: DocumentSignatureRequest; participant: SignatureParticipant }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_signature_participants")
      .select("*, document_signatures(*, documents(title, document_number))")
      .eq("customer_id", customerId)
      .eq("status", "Pending");
    if (error) return [];
    return (data ?? [])
      .filter((row) => row.document_signatures)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => ({ request: mapRequest(row.document_signatures), participant: mapParticipant(row) }));
  },

  async listParticipants(signatureId: string): Promise<SignatureParticipant[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_signature_participants").select("*").eq("signature_id", signatureId).order("sign_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapParticipant);
  },

  /** The signing action itself (section 28/29/67) — validates signing
   *  order (sequential mode: every earlier-order participant must have
   *  already signed) server-side, never trusting the client to enforce
   *  it. Records method/metadata/IP/user-agent for the audit trail
   *  (section 30), completes the whole request once every participant
   *  has signed. */
  async sign(
    participantId: string,
    input: { method: SignatureMethod; data: string; ipAddress?: string; userAgent?: string }
  ): Promise<SignatureParticipant> {
    const supabase = await createClient();
    const { data: participant, error: pErr } = await supabase.from("document_signature_participants").select("*, document_signatures(*)").eq("id", participantId).maybeSingle();
    if (pErr || !participant) throw new Error("Signature request not found.");
    if (participant.status !== "Pending") throw new Error("This signature has already been actioned.");

    const request = participant.document_signatures;
    if (request.status !== "Pending") throw new Error("This signature request is no longer active.");
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      await supabase.from("document_signatures").update({ status: "Expired" }).eq("id", request.id);
      throw new Error("This signature request has expired.");
    }

    if (request.signing_order_mode === "Sequential") {
      const { data: earlier } = await supabase
        .from("document_signature_participants")
        .select("id, status")
        .eq("signature_id", request.id)
        .lt("sign_order", participant.sign_order);
      if ((earlier ?? []).some((p) => p.status === "Pending")) {
        throw new Error("Please wait for the earlier participant(s) to sign first.");
      }
    }

    const { data: updated, error } = await supabase
      .from("document_signature_participants")
      .update({ status: "Signed", signed_at: new Date().toISOString(), signature_method: input.method, signature_data: input.data, ip_address: input.ipAddress || null, user_agent: input.userAgent || null })
      .eq("id", participantId)
      .eq("status", "Pending")
      .select("*")
      .maybeSingle();
    if (error || !updated) throw new Error("Could not record this signature — please try again.");

    await activityService.log("Signature Completed", `${participant.participant_name} signed`, "document", request.document_id, { method: input.method, participantId });

    const { data: remaining } = await supabase.from("document_signature_participants").select("id").eq("signature_id", request.id).eq("status", "Pending");
    if (!remaining || remaining.length === 0) {
      await supabase.from("document_signatures").update({ status: "Completed", completed_at: new Date().toISOString() }).eq("id", request.id);
      await activityService.log("Agreement Signed", "All participants have signed", "document", request.document_id);
    }

    return mapParticipant(updated);
  },

  async decline(participantId: string, reason?: string): Promise<void> {
    const supabase = await createClient();
    const { data: participant } = await supabase.from("document_signature_participants").select("signature_id, document_signatures(document_id)").eq("id", participantId).maybeSingle();
    const { error } = await supabase.from("document_signature_participants").update({ status: "Declined" }).eq("id", participantId).eq("status", "Pending");
    if (error) throw new Error("Could not decline this signature request.");
    if (participant?.signature_id) {
      await supabase.from("document_signatures").update({ status: "Cancelled" }).eq("id", participant.signature_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docId = (participant.document_signatures as any)?.document_id;
      if (docId) await activityService.log("Signature Declined", reason || "Declined by participant", "document", docId);
    }
  },

  async cancelRequest(signatureId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("document_signatures").update({ status: "Cancelled" }).eq("id", signatureId);
    if (error) throw new Error("Could not cancel this signature request.");
  },
};
