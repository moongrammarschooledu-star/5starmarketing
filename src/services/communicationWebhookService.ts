import "server-only";
import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { staffNotificationService } from "./staffNotificationService";

/** Verifies Meta's X-Hub-Signature-256 header (section 44) — the actual
 *  security boundary for this webhook. Without WHATSAPP_APP_SECRET
 *  configured, every call is refused rather than trusted blindly. */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

async function findConversationForPhone(supabase: ReturnType<typeof createServiceRoleClient>, phone: string) {
  const digits = normalizePhone(phone);

  const { data: existing } = await supabase
    .from("communication_conversations")
    .select("id, lead_id, customer_id, assigned_agent_id")
    .eq("channel", "WHATSAPP")
    .eq("counterpart_phone", digits)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data: lead } = await supabase.from("leads").select("id, assigned_agent_id, whatsapp, phone").or(`whatsapp.eq.${digits},phone.eq.${digits}`).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: created, error } = await supabase
    .from("communication_conversations")
    .insert({
      channel: "WHATSAPP",
      lead_id: lead?.id || null,
      assigned_agent_id: lead?.assigned_agent_id || null,
      counterpart_phone: digits,
      is_unmatched: !lead,
    })
    .select("id, lead_id, customer_id, assigned_agent_id")
    .single();
  if (error) throw new Error(`Could not create a conversation for inbound WhatsApp message: ${error.message}`);
  return created;
}

/** Processes one Meta WhatsApp Cloud API webhook payload (sections
 *  14, 44-46, 60) — inbound customer messages AND delivery/read/failed
 *  status updates for messages this deployment sent. This is the ONLY
 *  place a message is ever marked DELIVERED or READ. */
export async function processWhatsAppWebhookPayload(payload: unknown): Promise<{ processed: number }> {
  const supabase = createServiceRoleClient();
  let processed = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (payload as any)?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};

      for (const message of value.messages ?? []) {
        const fromPhone = message.from as string;
        const text: string = message.text?.body ?? (message.type ? `[${message.type} message]` : "");
        const providerMessageId: string = message.id;

        const { data: dup } = await supabase.from("communication_messages").select("id").eq("provider_message_id", providerMessageId).eq("direction", "INBOUND").maybeSingle();
        if (dup) continue; // Idempotent — Meta may retry the same webhook delivery.

        const conversation = await findConversationForPhone(supabase, fromPhone);

        // STOP-keyword opt-out handling (section 60) — recorded honestly
        // even though this deployment has no confirmed matching customer
        // account in most cases (leads aren't customer_profiles rows).
        if (/^\s*(stop|unsubscribe)\s*$/i.test(text) && conversation.customer_id) {
          const { data: current } = await supabase.from("customer_profiles").select("whatsapp_opt_in").eq("id", conversation.customer_id).maybeSingle();
          await supabase.from("customer_profiles").update({ whatsapp_opt_in: false }).eq("id", conversation.customer_id);
          await supabase
            .from("communication_consent_history")
            .insert({ customer_id: conversation.customer_id, field: "whatsapp_opt_in", old_value: current?.whatsapp_opt_in ?? null, new_value: false, source: "stop_keyword" });
        }

        const { data: msgRow } = await supabase
          .from("communication_messages")
          .insert({ conversation_id: conversation.id, direction: "INBOUND", channel: "WHATSAPP", status: "DELIVERED", body: text, provider: "meta_whatsapp", provider_message_id: providerMessageId, sent_at: new Date().toISOString() })
          .select("id")
          .single();

        await supabase.from("communication_conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: text.slice(0, 140) }).eq("id", conversation.id);
        await supabase.from("communication_audit_logs").insert({ conversation_id: conversation.id, message_id: msgRow?.id, action: "Received (inbound webhook)" });

        if (conversation.assigned_agent_id) {
          await staffNotificationService.notify(conversation.assigned_agent_id, "automation_alert", "New WhatsApp message", text.slice(0, 140) || "New message received.", "conversation", conversation.id);
        }
        processed += 1;
      }

      for (const status of value.statuses ?? []) {
        const providerMessageId: string = status.id;
        const newStatus: string = String(status.status || "").toUpperCase(); // sent|delivered|read|failed
        if (!["SENT", "DELIVERED", "READ", "FAILED"].includes(newStatus)) continue;

        const { data: message } = await supabase.from("communication_messages").select("id, status").eq("provider_message_id", providerMessageId).maybeSingle();
        if (!message) continue;

        const patch: Record<string, unknown> = { status: newStatus };
        if (newStatus === "DELIVERED") patch.delivered_at = new Date().toISOString();
        if (newStatus === "READ") patch.read_at = new Date().toISOString();
        if (newStatus === "FAILED") patch.failure_reason = status.errors?.[0]?.title || "Provider reported failure.";

        await supabase.from("communication_messages").update(patch).eq("id", message.id);
        await supabase.from("communication_delivery_logs").insert({
          message_id: message.id,
          provider: "meta_whatsapp",
          provider_message_id: providerMessageId,
          status: newStatus,
          error_code: status.errors?.[0]?.code ? String(status.errors[0].code) : null,
          error_message: status.errors?.[0]?.title || null,
          raw_event: status,
        });
        processed += 1;
      }
    }
  }

  return { processed };
}
