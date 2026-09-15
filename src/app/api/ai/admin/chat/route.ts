import { NextRequest, NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { runAiChat, AiUnavailableError } from "@/lib/ai/chat";
import { resolveAdminActor, AiAuthError } from "@/lib/ai/actor";
import { aiConversationService } from "@/services/aiConversationService";
import type { AssistantType } from "@/lib/models/ai";
import { assistantTypes } from "@/lib/models/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { assistantType?: string; conversationId?: string; messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const assistantType = body.assistantType as AssistantType;
  if (!assistantTypes.includes(assistantType)) {
    return NextResponse.json({ error: "Unknown assistant type." }, { status: 400 });
  }
  if (!body.conversationId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "conversationId and messages are required." }, { status: 400 });
  }

  try {
    const actor = await resolveAdminActor(assistantType);

    // Defense in depth: confirm this conversation actually belongs to
    // this admin before letting them append to it (RLS also enforces
    // this at the DB layer).
    const conversation = await aiConversationService.getById(body.conversationId);
    if (!conversation || conversation.adminId !== actor.id) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const result = await runAiChat({
      actor,
      assistantType,
      conversationId: body.conversationId,
      messages: body.messages,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    if (err instanceof AiAuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AiUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("Admin AI chat error:", err);
    return NextResponse.json({ error: "The AI assistant hit an unexpected error. Please try again." }, { status: 500 });
  }
}
