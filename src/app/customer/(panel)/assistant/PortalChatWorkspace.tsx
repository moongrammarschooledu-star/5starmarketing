"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { createPortalAiConversationAction, getPortalAiConversationMessagesAction } from "@/lib/actions/ai.actions";
import type { AiConversation } from "@/lib/models/ai";
import type { UIMessage } from "ai";

export function PortalChatWorkspace({
  initialConversations,
  suggestedPrompts,
  disabled,
}: {
  initialConversations: AiConversation[];
  suggestedPrompts: string[];
  disabled: boolean;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [pending, startTransition] = useTransition();

  function newConversation() {
    startTransition(async () => {
      const conv = await createPortalAiConversationAction();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setInitialMessages([]);
    });
  }

  function openConversation(id: string) {
    startTransition(async () => {
      const msgs = await getPortalAiConversationMessagesAction(id);
      setActiveId(id);
      setInitialMessages(
        msgs.map((m) => ({ id: m.id, role: m.role === "tool" ? "assistant" : m.role, parts: [{ type: "text", text: m.content }] })) as UIMessage[]
      );
    });
  }

  if (disabled) {
    return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">The AI assistant is currently unavailable. Please check back later.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      <div>
        <button onClick={newConversation} disabled={pending} className="flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="mt-3 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${activeId === c.id ? "bg-primary/10 font-bold text-primary" : "text-ink hover:bg-muted/10"}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>
      <div>
        {activeId ? (
          <ChatPanel
            key={activeId}
            api="/api/ai/customer/chat"
            conversationId={activeId}
            initialMessages={initialMessages}
            suggestedPrompts={suggestedPrompts}
            disclaimer="This assistant answers only from your own authorized account data and published, approved information. It never guarantees availability, pricing, or outcomes."
          />
        ) : (
          <button onClick={newConversation} className="flex h-[75vh] w-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted">
            Start a new chat
          </button>
        )}
      </div>
    </div>
  );
}
