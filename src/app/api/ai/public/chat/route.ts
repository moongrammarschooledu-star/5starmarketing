import { NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { isGatewayConfigured, resolveModel, DEFAULT_AI_MODEL } from "@/lib/ai/gateway";
import { publicAiTools, PUBLIC_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/publicChat";
import { isRateLimited } from "@/lib/rateLimit";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const MAX_MESSAGES = 20;

/** The public homepage assistant. Deliberately stateless — no
 *  conversation is persisted server-side (there's no logged-in actor
 *  to own one); the client resends its own message history each turn,
 *  same as any simple chat widget. Rate-limited by IP since this is
 *  the only AI endpoint in this codebase with no login gate at all. */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`ai-public-chat:${ip}`, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment and try again." }, { status: 429 });
  }

  if (!isGatewayConfigured()) {
    return NextResponse.json(
      { error: "The AI assistant is not configured yet. Please contact us on WhatsApp instead." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const messages = body?.messages as UIMessage[] | undefined;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Never let a client send an unbounded/replayed history to the model.
  const trimmed = messages.slice(-MAX_MESSAGES);

  try {
    const result = streamText({
      model: resolveModel(DEFAULT_AI_MODEL),
      system: PUBLIC_ASSISTANT_SYSTEM_PROMPT,
      messages: await convertToModelMessages(trimmed),
      tools: publicAiTools,
      stopWhen: stepCountIs(4),
      onError: (err) => {
        console.error("Public AI chat stream error:", err);
      },
    });
    return result.toUIMessageStreamResponse({
      // TEMPORARY diagnostic — production was returning a generic "An
      // error occurred." with no way to see the real cause (no server
      // log access from this session). Surfaces the real error text to
      // the client so it can be read from a browser network tab. Revert
      // to the SDK's default generic message once the real cause is
      // identified and fixed.
      onError: (err) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err)),
    });
  } catch (err) {
    console.error("Public AI chat error:", err);
    return NextResponse.json({ error: "The assistant hit an unexpected error. Please try again or use WhatsApp." }, { status: 500 });
  }
}
