"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Building2, Handshake, Tag as TagIcon, X, Plus } from "lucide-react";
import type { Conversation, ConversationPriority } from "@/lib/models/communication";
import { conversationPriorities } from "@/lib/models/communication";
import type { MarketingTag } from "@/lib/models/marketingTag";
import {
  assignConversationAction,
  transferConversationAction,
  setConversationPriorityAction,
  setConversationStatusAction,
  addConversationTagAction,
  removeConversationTagAction,
  linkConversationToLeadAction,
  createLeadFromUnmatchedAction,
  ignoreUnmatchedConversationAction,
} from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function ConversationSidebar({
  conversation,
  agents,
  allTags,
  canManage,
}: {
  conversation: Conversation;
  agents: { id: string; name: string }[];
  allTags: MarketingTag[];
  canManage: boolean;
}) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function assign(agentId: string) {
    startTransition(async () => {
      if (canManage) await transferConversationAction(conversation.id, agentId);
      else await assignConversationAction(conversation.id, agentId || null);
      toast.show("Conversation assigned.");
      router.refresh();
    });
  }

  function setPriority(priority: ConversationPriority) {
    startTransition(async () => {
      await setConversationPriorityAction(conversation.id, priority);
      router.refresh();
    });
  }

  function setStatus(status: "OPEN" | "CLOSED" | "ARCHIVED") {
    startTransition(async () => {
      await setConversationStatusAction(conversation.id, status);
      toast.show(`Conversation ${status.toLowerCase()}.`);
      router.refresh();
    });
  }

  function addTag(tagId: string) {
    setShowTagPicker(false);
    startTransition(async () => {
      await addConversationTagAction(conversation.id, tagId);
      router.refresh();
    });
  }

  function removeTag(tagId: string) {
    startTransition(async () => {
      await removeConversationTagAction(conversation.id, tagId);
      router.refresh();
    });
  }

  function createLead() {
    startTransition(async () => {
      await createLeadFromUnmatchedAction(conversation.id);
      toast.show("Lead created and linked.");
      router.refresh();
    });
  }

  function ignore() {
    if (!confirm("Archive this unmatched conversation as spam/ignored?")) return;
    startTransition(async () => {
      await ignoreUnmatchedConversationAction(conversation.id);
      toast.show("Conversation archived.");
      router.push("/admin/communications/inbox");
    });
  }

  const availableTags = allTags.filter((t) => !(conversation.tags ?? []).includes(t.name));

  return (
    <div className="space-y-5">
      {conversation.isUnmatched && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-bold text-ink">Unmatched Conversation</p>
          <p className="mt-1 text-xs text-muted">This contact doesn&apos;t match any existing lead or customer.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={createLead} disabled={isPending} className="rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Create Lead
            </button>
            <button type="button" onClick={ignore} disabled={isPending} className="rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              Ignore / Spam
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <User className="h-4 w-4 text-primary" /> Contact
        </h3>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Name" value={conversation.leadName || conversation.customerName || conversation.counterpartName || "—"} />
          {conversation.counterpartPhone && <Row label="Phone" value={conversation.counterpartPhone} />}
          {conversation.counterpartEmail && <Row label="Email" value={conversation.counterpartEmail} />}
        </div>
        {conversation.leadId && (
          <Link href={`/admin/crm/leads/${conversation.leadId}`} className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
            View CRM Lead →
          </Link>
        )}
        {conversation.customerId && (
          <Link href={`/admin/customers/${conversation.customerId}`} className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
            View Customer →
          </Link>
        )}
      </div>

      {(conversation.propertyTitle || conversation.projectName || conversation.dealNumber) && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
            <Building2 className="h-4 w-4 text-primary" /> Context
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            {conversation.propertyTitle && <Row label="Property" value={conversation.propertyTitle} />}
            {conversation.projectName && <Row label="Project" value={conversation.projectName} />}
            {conversation.dealNumber && (
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Deal</span>
                <Link href={`/admin/deals/${conversation.dealId}`} className="flex items-center gap-1 font-semibold text-primary hover:underline">
                  <Handshake className="h-3.5 w-3.5" /> {conversation.dealNumber}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-heading text-sm font-bold text-ink">Assignment &amp; Priority</h3>
        <label className="mt-3 flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-muted-foreground">Assigned Agent</span>
          <select defaultValue={conversation.assignedAgentId ?? ""} onChange={(e) => assign(e.target.value)} disabled={isPending} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-muted-foreground">Priority</span>
          <select defaultValue={conversation.priority} onChange={(e) => setPriority(e.target.value as ConversationPriority)} disabled={isPending} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
            {conversationPriorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 flex gap-2">
          {conversation.status !== "CLOSED" ? (
            <button type="button" onClick={() => setStatus("CLOSED")} disabled={isPending} className="flex-1 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              Close
            </button>
          ) : (
            <button type="button" onClick={() => setStatus("OPEN")} disabled={isPending} className="flex-1 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              Reopen
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <TagIcon className="h-4 w-4 text-primary" /> Tags
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {(conversation.tags ?? []).map((name) => {
            const tag = allTags.find((t) => t.name === name);
            return (
              <span key={name} className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink">
                {name}
                {tag && (
                  <button type="button" onClick={() => removeTag(tag.id)} disabled={isPending} className="text-muted hover:text-primary">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
          <div className="relative">
            <button type="button" onClick={() => setShowTagPicker((v) => !v)} className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted hover:border-primary hover:text-primary">
              <Plus className="h-3 w-3" /> Add
            </button>
            {showTagPicker && (
              <div className="absolute left-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
                {availableTags.length === 0 && <p className="p-2 text-xs text-muted">No more tags.</p>}
                {availableTags.map((t) => (
                  <button key={t.id} type="button" onClick={() => addTag(t.id)} className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-ink hover:bg-surface-muted">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!conversation.leadId && !conversation.isUnmatched && (
        <LinkLeadPicker conversationId={conversation.id} />
      )}
    </div>
  );
}

function LinkLeadPicker({ conversationId }: { conversationId: string }) {
  const [leadId, setLeadId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function link() {
    if (!leadId.trim()) return;
    startTransition(async () => {
      try {
        await linkConversationToLeadAction(conversationId, leadId.trim());
        toast.show("Linked.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not link this lead.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Link to a Lead</p>
      <div className="mt-2 flex gap-2">
        <input type="text" value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="Lead ID" className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
        <button type="button" onClick={link} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Link
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
