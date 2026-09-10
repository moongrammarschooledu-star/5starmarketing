"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus, XCircle } from "lucide-react";
import type { DocumentRecord, DocumentSignatureRequest, SigningOrderMode, ParticipantType } from "@/lib/models/document";
import { participantTypes } from "@/lib/models/document";
import { createSignatureRequestAction, cancelSignatureRequestAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface ParticipantDraft {
  participantType: ParticipantType;
  participantName: string;
  participantEmail: string;
  customerId?: string;
}

export function DocumentSignaturePanel({ document, requests, customerName, customerId }: { document: DocumentRecord; requests: DocumentSignatureRequest[]; customerName?: string; customerId?: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [signingOrderMode, setSigningOrderMode] = useState<SigningOrderMode>("Sequential");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [participants, setParticipants] = useState<ParticipantDraft[]>(
    customerId && customerName ? [{ participantType: "Customer", participantName: customerName, participantEmail: "", customerId }] : [{ participantType: "Customer", participantName: "", participantEmail: "" }]
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function addParticipant() {
    setParticipants((p) => [...p, { participantType: "Other", participantName: "", participantEmail: "" }]);
  }

  function updateParticipant(i: number, patch: Partial<ParticipantDraft>) {
    setParticipants((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function removeParticipant(i: number) {
    setParticipants((p) => p.filter((_, idx) => idx !== i));
  }

  function create() {
    setError(null);
    if (participants.some((p) => !p.participantName.trim())) {
      setError("Every participant needs a name.");
      return;
    }
    setShowCreate(false);
    startTransition(async () => {
      try {
        await createSignatureRequestAction(
          document.id,
          document.currentVersion,
          participants.map((p, i) => ({ participantType: p.participantType, participantName: p.participantName.trim(), participantEmail: p.participantEmail || undefined, customerId: p.customerId, signOrder: i + 1 })),
          { signingOrderMode, expiresInDays: expiresInDays ? Number(expiresInDays) : undefined }
        );
        toast.show("Signature request created.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this signature request.");
      }
    });
  }

  function cancel(signatureId: string) {
    startTransition(async () => {
      await cancelSignatureRequestAction(signatureId, document.id);
      toast.show("Signature request cancelled.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <PenLine className="h-4.5 w-4.5 text-primary" /> Digital Signature
        </h2>
        <button type="button" onClick={() => setShowCreate(true)} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Request Signature
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">A digital signature record for internal tracking — not a legally binding electronic signature.</p>

      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No signature requests yet.</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm">
              <div>
                <div className="font-semibold text-ink">
                  {r.signingOrderMode} · v{r.documentVersion}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("en-GB")}
                  {r.expiresAt && ` · Expires ${new Date(r.expiresAt).toLocaleDateString("en-GB")}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === "Pending" && (
                  <button type="button" onClick={() => cancel(r.id)} title="Cancel" className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Request Signature">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Signing Order</span>
              <select value={signingOrderMode} onChange={(e) => setSigningOrderMode(e.target.value as SigningOrderMode)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
                <option value="Sequential">Sequential</option>
                <option value="Parallel">Parallel</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Expires In (days)</span>
              <input type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            </label>
          </div>

          <div className="space-y-2.5">
            {participants.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-border p-2.5">
                <select value={p.participantType} onChange={(e) => updateParticipant(i, { participantType: e.target.value as ParticipantType })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary">
                  {participantTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input type="text" placeholder="Name" value={p.participantName} onChange={(e) => updateParticipant(i, { participantName: e.target.value })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary" />
                <button type="button" onClick={() => removeParticipant(i)} className="text-xs font-bold text-primary">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addParticipant} className="text-xs font-bold text-primary hover:underline">
              + Add Participant
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowCreate(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={create} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Create Request
          </button>
        </div>
      </Modal>
    </div>
  );
}
