"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NoticeRecipientType, LegalNoticeType } from "@/lib/models/legal";
import { noticeRecipientTypes, legalNoticeTypes } from "@/lib/models/legal";
import { createLegalNoticeDraftAction, sendLegalNoticeViaCommunicationCenterAction, recordManualNoticeSendAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewLegalNoticeForm({ properties, defaultPropertyId }: { properties: { id: string; title: string }[]; defaultPropertyId?: string }) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [recipientType, setRecipientType] = useState<NoticeRecipientType>("CUSTOMER");
  const [recipientName, setRecipientName] = useState("");
  const [recipientCustomerId, setRecipientCustomerId] = useState("");
  const [noticeType, setNoticeType] = useState<LegalNoticeType>("DEMAND");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create(sendNow: "communication" | "manual" | "draft") {
    if (!recipientName.trim() || !subject.trim() || !body.trim()) {
      toast.show("Please fill in recipient, subject and body.");
      return;
    }
    startTransition(async () => {
      try {
        const notice = await createLegalNoticeDraftAction({
          propertyId: propertyId || undefined,
          recipientType,
          recipientCustomerId: recipientCustomerId || undefined,
          recipientName: recipientName.trim(),
          noticeType,
          subject: subject.trim(),
          body: body.trim(),
        });
        if (sendNow === "communication") await sendLegalNoticeViaCommunicationCenterAction(notice.id);
        if (sendNow === "manual") await recordManualNoticeSendAction(notice.id, "OTHER");
        toast.show(sendNow === "draft" ? "Notice saved as draft." : "Notice sent.");
        setRecipientName("");
        setSubject("");
        setBody("");
        setRecipientCustomerId("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this notice.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">New Legal Notice</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
          <option value="">No specific property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={noticeType} onChange={(e) => setNoticeType(e.target.value as LegalNoticeType)} className={inputClass}>
          {legalNoticeTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select value={recipientType} onChange={(e) => setRecipientType(e.target.value as NoticeRecipientType)} className={inputClass}>
          {noticeRecipientTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClass} />
        <input placeholder="Recipient customer ID (for Communication Center delivery, optional)" value={recipientCustomerId} onChange={(e) => setRecipientCustomerId(e.target.value)} className={`${inputClass} sm:col-span-2`} />
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} sm:col-span-2`} />
        <textarea placeholder="Notice body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={`${inputClass} sm:col-span-2`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => create("draft")} disabled={isPending} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
          Save Draft
        </button>
        <button type="button" onClick={() => create("communication")} disabled={isPending || !recipientCustomerId} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Send via Communication Center
        </button>
        <button type="button" onClick={() => create("manual")} disabled={isPending} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
          Record as Sent Manually
        </button>
      </div>
    </div>
  );
}
