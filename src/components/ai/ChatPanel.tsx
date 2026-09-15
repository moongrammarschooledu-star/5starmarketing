"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Square, RotateCcw, ThumbsUp, ThumbsDown, Copy } from "lucide-react";

export interface ChatConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/** Shared chat UI used by both /admin/ai/chat and /portal/assistant/chat.
 *  `api` is the route this conversation posts to; `assistantType` is only
 *  sent on the admin route (the customer route ignores it server-side and
 *  always resolves CUSTOMER_PORTAL itself). */
export function ChatPanel({
  api,
  conversationId,
  assistantType,
  initialMessages,
  suggestedPrompts,
  disclaimer,
}: {
  api: string;
  conversationId: string;
  assistantType?: string;
  initialMessages: UIMessage[];
  suggestedPrompts?: string[];
  disclaimer?: string;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api,
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: { conversationId: id, assistantType, messages },
        }),
      }),
    [api, assistantType]
  );

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    sendMessage({ text: value });
    setInput("");
  }

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-[75vh] flex-col rounded-2xl border border-border bg-surface">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl bg-muted/10 p-4 text-sm text-muted">
            <p>Ask a question to get started. This assistant only answers from your authorized, real records — it will say so if it doesn&apos;t have an answer.</p>
            {suggestedPrompts && suggestedPrompts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedPrompts.map((p) => (
                  <button key={p} onClick={() => submit(p)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-primary">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error.message || "Something went wrong. Please try again."}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {disclaimer && <p className="border-t border-border px-4 py-2 text-[11px] text-muted">{disclaimer}</p>}

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask the assistant..."
          className="flex-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button onClick={() => stop()} className="flex items-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white">
            <Square className="h-4 w-4" /> Stop
          </button>
        ) : (
          <button onClick={() => submit()} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white">
            <Send className="h-4 w-4" /> Send
          </button>
        )}
        {!isStreaming && messages.length > 0 && (
          <button onClick={() => regenerate()} title="Regenerate" className="rounded-xl border border-border p-2 text-ink">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  const toolParts = message.parts.filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool");
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? "bg-primary text-white" : "bg-muted/10 text-ink"}`}>
        {toolParts.length > 0 && !isUser && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-60">
            Looked up: {toolParts.length} record source{toolParts.length > 1 ? "s" : ""}
          </p>
        )}
        <p className="whitespace-pre-wrap">{text}</p>
        {!isUser && text && (
          <div className="mt-2 flex gap-2 opacity-60">
            <button onClick={() => navigator.clipboard.writeText(text)} title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button title="Helpful">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button title="Not helpful">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
