"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { createAiConversationAction, getAiConversationMessagesAction } from "@/lib/actions/ai.actions";
import type { AiConversation, AssistantType } from "@/lib/models/ai";
import type { UIMessage } from "ai";

export function ChatWorkspace({
  assistants,
  assistantLabels,
  suggestedPrompts,
  initialConversations,
}: {
  assistants: AssistantType[];
  assistantLabels: Record<string, string>;
  suggestedPrompts: Record<string, string[]>;
  initialConversations: AiConversation[];
}) {
  const [assistantType, setAssistantType] = useState<AssistantType>(assistants[0] ?? "ADMIN");
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations.find((c) => c.assistantType === assistantType)?.id ?? null
  );
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [pending, startTransition] = useTransition();

  const visibleConversations = conversations.filter((c) => c.assistantType === assistantType);

  function newConversation() {
    startTransition(async () => {
      const conv = await createAiConversationAction(assistantType);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setInitialMessages([]);
    });
  }

  function openConversation(id: string) {
    startTransition(async () => {
      const msgs = await getAiConversationMessagesAction(id);
      setActiveId(id);
      setInitialMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role === "tool" ? "assistant" : m.role,
          parts: [{ type: "text", text: m.content }],
        })) as UIMessage[]
      );
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      <div>
        <select
          value={assistantType}
          onChange={(e) => {
            const next = e.target.value as AssistantType;
            setAssistantType(next);
            const existing = conversations.find((c) => c.assistantType === next);
            if (existing) openConversation(existing.id);
            else {
              setActiveId(null);
              setInitialMessages([]);
            }
          }}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm font-medium"
        >
          {assistants.map((a) => (
            <option key={a} value={a}>
              {assistantLabels[a]}
            </option>
          ))}
        </select>

        <button
          onClick={newConversation}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New conversation
        </button>

        <div className="mt-3 space-y-1">
          {visibleConversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                activeId === c.id ? "bg-primary/10 font-bold text-primary" : "text-ink hover:bg-muted/10"
              }`}
            >
              {c.title}
            </button>
          ))}
          {visibleConversations.length === 0 && <p className="px-3 py-2 text-xs text-muted">No conversations yet.</p>}
        </div>
      </div>

      <div>
        {activeId ? (
          <ChatPanel
            key={activeId}
            api="/api/ai/admin/chat"
            conversationId={activeId}
            assistantType={assistantType}
            initialMessages={initialMessages}
            suggestedPrompts={suggestedPrompts[assistantType]}
            disclaimer="AI responses are drafted from real, authorized records. Any write action (task, note, message) requires your explicit confirmation and may need approval before it takes effect."
          />
        ) : (
          <div className="flex h-[75vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted">
            Start a new conversation to begin.
          </div>
        )}
      </div>
    </div>
  );
}
