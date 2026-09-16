"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { Bot, X, Send, Sparkles } from "lucide-react";

/** Public homepage AI chat — anonymous, stateless (no login, no
 *  persisted conversation), read-only (property search + FAQ only).
 *  Sits next to the WhatsApp floating button, never on top of it. */
export function PublicAiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/public/chat",
        prepareSendMessagesRequest: ({ messages }) => ({ body: { messages } }),
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI Assistant" : "Chat with our AI Assistant"}
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/20 transition-transform hover:scale-110 sm:bottom-28 sm:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-40 z-50 mx-auto flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:bottom-44 sm:right-6 sm:left-auto">
          <div className="flex items-center gap-2 border-b border-border bg-primary px-4 py-3 text-white">
            <Sparkles className="h-4.5 w-4.5" />
            <div>
              <p className="text-sm font-bold">5STAR.M AI Assistant</p>
              <p className="text-[11px] text-white/80">Ask about properties or FAQs</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <div className="rounded-xl bg-surface-muted p-3 text-muted">
                <p>Hi! I can help you find properties or answer questions from our FAQ. Try asking:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>&ldquo;Show me houses in Johar Town under 2 crore&rdquo;</li>
                  <li>&ldquo;What payment plans do you offer?&rdquo;</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  I can&apos;t access accounts, bookings, or private records — for that, please log in or contact us directly.
                </p>
              </div>
            )}
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            {error && (
              <div className="rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">
                {error.message || "Something went wrong. Please try WhatsApp instead."}
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a property or FAQ…"
              className="flex-1 rounded-full border border-border bg-surface px-3.5 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={status === "streaming" || status === "submitted" || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
            AI-generated — always confirm details with our team. <Link href="/contact" className="font-bold text-primary">Contact us</Link>
          </p>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  if (!text) return null;
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-white"
            : "max-w-[85%] rounded-2xl bg-surface-muted px-3.5 py-2 text-ink"
        }
      >
        <p className="whitespace-pre-wrap">{renderBoldSegments(text)}</p>
      </div>
    </div>
  );
}

/** The model occasionally uses **bold** markdown; this renders just
 *  that one construct rather than pulling in a full markdown library
 *  for a chat bubble. */
function renderBoldSegments(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
