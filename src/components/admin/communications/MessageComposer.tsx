"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Clock, Save, FileText, Lock, Paperclip, X } from "lucide-react";
import type { Conversation, CommChannel, ComposerDealContext } from "@/lib/models/communication";
import type { MarketingTemplate } from "@/lib/models/marketingTemplate";
import { interpolateTemplate } from "@/lib/templateInterpolation";
import { composeMessageAction, uploadMessageAttachmentAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function templateVars(conversation: Conversation, dealContext?: ComposerDealContext): Record<string, string> {
  return {
    customer_name: conversation.leadName || conversation.customerName || conversation.counterpartName || "",
    customer_phone: conversation.counterpartPhone || "",
    customer_email: conversation.counterpartEmail || "",
    property_title: conversation.propertyTitle || "",
    project_name: conversation.projectName || "",
    deal_number: conversation.dealNumber || "",
    company_name: "5STAR.M Estate & Builders",
    deal_amount: dealContext?.dealAmount || "",
    payment_amount: dealContext?.paymentAmount || "",
    outstanding_amount: dealContext?.outstandingAmount || "",
    due_date: dealContext?.dueDate || "",
  };
}

export function MessageComposer({ conversation, templates, dealContext }: { conversation: Conversation; templates: MarketingTemplate[]; dealContext?: ComposerDealContext }) {
  const [channel, setChannel] = useState<CommChannel>(conversation.channel === "INTERNAL" ? "INTERNAL" : conversation.channel);
  const [asInternal, setAsInternal] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduleFor, setScheduleFor] = useState("");
  const [isMarketing, setIsMarketing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const canExternal = channel === "WHATSAPP" || channel === "EMAIL" || channel === "SMS";
  const applicableTemplates = templates.filter((t) => t.channel === channel);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      const vars = templateVars(conversation, dealContext);
      setBody(interpolateTemplate(template.content, vars));
      if (template.subject) setSubject(interpolateTemplate(template.subject, vars));
    }
  }

  function submit(mode: "send" | "schedule" | "draft") {
    if (!body.trim() && !asInternal) {
      toast.show("Please enter a message.");
      return;
    }
    if (mode === "schedule" && !scheduleFor) {
      toast.show("Please choose a schedule date/time.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await composeMessageAction({
          conversationId: conversation.id,
          channel: asInternal ? "INTERNAL" : channel,
          direction: asInternal ? "INTERNAL" : "OUTBOUND",
          subject: channel === "EMAIL" ? subject : undefined,
          body,
          templateId: templateId || undefined,
          isPrivateNote: asInternal,
          isMarketing,
          scheduledFor: mode === "schedule" ? new Date(scheduleFor).toISOString() : undefined,
          saveDraft: mode === "draft",
        });

        for (const file of files) {
          try {
            const dataUri = await readFileAsDataUri(file);
            await uploadMessageAttachmentAction(result.id, conversation.id, file.name, dataUri);
          } catch (e) {
            toast.show(e instanceof Error ? `${file.name}: ${e.message}` : `Could not attach ${file.name}.`);
          }
        }

        if (mode === "send" && result.status === "FAILED") {
          toast.show(`Could not send: ${result.failureReason}`);
        } else {
          toast.show(mode === "schedule" ? "Message scheduled." : mode === "draft" ? "Draft saved." : asInternal ? "Note added." : "Message sent.");
        }
        setBody("");
        setSubject("");
        setTemplateId("");
        setScheduleFor("");
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not send this message.");
      }
    });
  }

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const oversized = picked.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      toast.show(`${oversized.name} is larger than 15MB.`);
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={asInternal ? "INTERNAL" : channel} onChange={(e) => (e.target.value === "INTERNAL" ? setAsInternal(true) : (setAsInternal(false), setChannel(e.target.value as CommChannel)))} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-ink outline-none focus:border-primary">
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="INTERNAL">Internal Note</option>
        </select>
        {!asInternal && applicableTemplates.length > 0 && (
          <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-primary">
            <option value="">
              Use a template...
            </option>
            {applicableTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        {!asInternal && canExternal && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <input type="checkbox" checked={isMarketing} onChange={(e) => setIsMarketing(e.target.checked)} className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
            Marketing message
          </label>
        )}
      </div>

      {asInternal && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
          <Lock className="h-3.5 w-3.5" /> Internal note — never sent externally, never visible to the customer.
        </p>
      )}

      {channel === "EMAIL" && !asInternal && (
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={asInternal ? "e.g. Customer requested callback after 5 PM." : "Type your message..."}
        className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />

      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink">
              <Paperclip className="h-3 w-3" /> {f.name}
              <button type="button" onClick={() => removeFile(i)} className="text-muted hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!asInternal && (
          <input type="datetime-local" value={scheduleFor} onChange={(e) => setScheduleFor(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary" />
        )}
        <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => pickFiles(e.target.files)} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Paperclip className="h-3.5 w-3.5" /> Attach
        </button>
        <div className="ml-auto flex gap-2">
          {!asInternal && (
            <>
              <button type="button" onClick={() => submit("draft")} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> Save Draft
              </button>
              <button type="button" onClick={() => submit("schedule")} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                <Clock className="h-3.5 w-3.5" /> Schedule
              </button>
            </>
          )}
          <button type="button" onClick={() => submit("send")} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {asInternal ? <FileText className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} {isPending ? "Sending..." : asInternal ? "Add Note" : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
