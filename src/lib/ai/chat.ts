import "server-only";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { isGatewayConfigured, DEFAULT_AI_MODEL, buildSystemPrompt, ASSISTANT_PERSONAS } from "./gateway";
import { buildToolSet } from "./tools";
import { aiConfigService } from "@/services/aiConfigService";
import { aiConversationService } from "@/services/aiConversationService";
import { aiAuditService } from "@/services/aiAuditService";
import type { AiActor, AiToolName, AssistantType } from "@/lib/models/ai";
import { AI_TOOL_NAMES } from "@/lib/models/ai";

export class AiUnavailableError extends Error {}

/** Shared entry point for both the admin chat route and the customer
 *  portal chat route. Handles: availability gate, per-assistant tool
 *  permission intersection, conversation persistence, streaming, and
 *  usage/error accounting. Neither route re-implements any of this. */
export async function runAiChat(params: {
  actor: AiActor;
  assistantType: AssistantType;
  conversationId: string;
  messages: UIMessage[];
}) {
  const { actor, assistantType, conversationId, messages } = params;
  const start = Date.now();

  const availability = await aiConfigService.isAssistantAvailable(assistantType);
  if (!availability.available || !availability.config) {
    throw new AiUnavailableError(availability.reason ?? "AI assistant is unavailable.");
  }
  const config = availability.config;

  if (!isGatewayConfigured()) {
    throw new AiUnavailableError(
      "The AI provider is not configured yet. An administrator needs to set AI_GATEWAY_API_KEY (Vercel AI Gateway) before this assistant can respond."
    );
  }

  // Persist the latest user message before calling the model, so nothing
  // is lost even if the model call fails.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const text = extractText(lastUser);
    await aiConversationService.addMessage(conversationId, "user", text);
  }

  const allowed = new Set<AiToolName>(
    AI_TOOL_NAMES.filter((t) => config.allowedTools.includes(t))
  );

  const toolSet = buildToolSet({ actor, assistantType, allowedTools: config.allowedTools, conversationId }, allowed);

  const system = buildSystemPrompt(ASSISTANT_PERSONAS[assistantType] ?? "", {
    writeActionsAllowed: config.allowWriteActions,
    requireApproval: config.requireApprovalForWrite,
  });

  let toolCallCount = 0;
  let errorCount = 0;

  const result = streamText({
    model: config.model || DEFAULT_AI_MODEL,
    system,
    messages: await convertToModelMessages(messages),
    tools: toolSet,
    stopWhen: stepCountIs(6),
    onStepFinish: (step) => {
      toolCallCount += step.toolCalls?.length ?? 0;
    },
    onError: (err) => {
      errorCount += 1;
      console.error("AI chat stream error:", err);
    },
    onFinish: async (finish) => {
      try {
        await aiConversationService.addMessage(conversationId, "assistant", finish.text ?? "");
        await aiAuditService.recordUsage({
          assistantType,
          actor,
          toolCallCount,
          errorCount,
          latencyMs: Date.now() - start,
        });
      } catch (err) {
        console.error("Failed to persist AI assistant response:", err);
      }
    },
  });

  return result;
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}
