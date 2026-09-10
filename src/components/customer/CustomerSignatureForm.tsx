"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PenLine, XCircle } from "lucide-react";
import type { SignatureMethod } from "@/lib/models/document";
import { signParticipantAction, declineParticipantAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerSignatureForm({ participantId, disclaimer }: { participantId: string; documentId: string; disclaimer: string }) {
  const [reviewed, setReviewed] = useState(false);
  const [method, setMethod] = useState<SignatureMethod>("Typed");
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function confirmSign() {
    setError(null);
    if (!reviewed) {
      setError("Please confirm you have reviewed this document.");
      return;
    }
    if (!typedName.trim()) {
      setError("Please type your full name to sign.");
      return;
    }
    startTransition(async () => {
      try {
        await signParticipantAction(participantId, method, typedName.trim());
        toast.show("Document signed.");
        router.push("/customer/documents");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not record your signature.");
      }
    });
  }

  function decline() {
    if (!confirm("Are you sure you want to decline signing this document?")) return;
    startTransition(async () => {
      try {
        await declineParticipantAction(participantId);
        toast.show("Signature declined.");
        router.push("/customer/documents");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not decline this request.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
        <p>
          <span className="font-bold">Digital Signature — Not Legally Binding.</span> {disclaimer}
        </p>
      </div>

      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary" />
        <span className="font-semibold text-ink">I have reviewed this document and agree to its contents.</span>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Signature Method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as SignatureMethod)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="Typed">Type my name</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Type your full name</span>
          <input type="text" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Full name" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm italic text-ink outline-none focus:border-primary" />
        </label>
      </div>

      {error && <p className="text-xs font-semibold text-primary">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={confirmSign} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-60">
          <PenLine className="h-4 w-4" /> Confirm &amp; Sign
        </button>
        <button type="button" onClick={decline} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
          <XCircle className="h-4 w-4" /> Decline
        </button>
      </div>
    </div>
  );
}
