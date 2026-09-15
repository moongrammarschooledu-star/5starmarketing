import { NextRequest, NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { runAiChat, AiUnavailableError } from "@/lib/ai/chat";
import { resolveCustomerActor, AiAuthError } from "@/lib/ai/actor";
import { aiConversationService } from "@/services/aiConversationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The customer portal only ever talks to the CUSTOMER_PORTAL assistant —
// never client-selectable, unlike the admin route's assistantType.
export async function POST(req: NextRequest) {
  let body: { conversationId?: string; messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.conversationId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "conversationId and messages are required." }, { status: 400 });
  }

  try {
    const actor = await resolveCustomerActor();
    const conversation = await aiConversationService.getById(body.conversationId);
    if (!conversation || conversation.customerId !== actor.id) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const result = await runAiChat({
      actor,
      assistantType: "CUSTOMER_PORTAL",
      conversationId: body.conversationId,
      messages: body.messages,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    if (err instanceof AiAuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AiUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("Customer AI chat error:", err);
    return NextResponse.json({ error: "The assistant hit an unexpected error. Please try again." }, { status: 500 });
  }
}
