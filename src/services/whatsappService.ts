import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  WhatsAppTemplate,
  WhatsAppTemplateInput,
  WhatsAppActivity,
  WhatsAppActivityAction,
} from "@/lib/models/whatsapp";

const ACTION_TO_DB: Record<WhatsAppActivityAction, string> = {
  "WhatsApp Opened": "whatsapp_opened",
  "Follow-Up Required": "follow_up_required",
  Contacted: "contacted",
};
const ACTION_FROM_DB: Record<string, WhatsAppActivityAction> = {
  whatsapp_opened: "WhatsApp Opened",
  follow_up_required: "Follow-Up Required",
  contacted: "Contacted",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToTemplate(row: any): WhatsAppTemplate {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToActivity(row: any): WhatsAppActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    action: ACTION_FROM_DB[row.action] ?? "WhatsApp Opened",
    templateName: row.template_name ?? undefined,
    admin: row.admin ?? undefined,
    createdAt: row.created_at,
  };
}

export const whatsappService = {
  // -------------------------------------------------------------------
  // Message templates — real, functional today (backed by Postgres).
  // These are the same templates a future Meta Cloud API integration
  // would submit for approval as "message templates"; for now they are
  // just reusable text plugged into a wa.me click-to-chat link.
  // -------------------------------------------------------------------
  async listTemplates(): Promise<WhatsAppTemplate[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("whatsappService.listTemplates failed:", error);
      throw new Error("Could not load WhatsApp templates.");
    }
    return (data ?? []).map(mapRowToTemplate);
  },

  async createTemplate(input: WhatsAppTemplateInput): Promise<WhatsAppTemplate> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .insert({ name: input.name, content: input.content })
      .select("*")
      .single();
    if (error) {
      console.error("whatsappService.createTemplate failed:", error);
      throw new Error("Could not create this template. Template names must be unique.");
    }
    return mapRowToTemplate(data);
  },

  async updateTemplate(id: string, input: WhatsAppTemplateInput): Promise<WhatsAppTemplate | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .update({ name: input.name, content: input.content })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("whatsappService.updateTemplate failed:", error);
      throw new Error("Could not update this template.");
    }
    return data ? mapRowToTemplate(data) : undefined;
  },

  async deleteTemplate(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) {
      console.error("whatsappService.deleteTemplate failed:", error);
      throw new Error("Could not delete this template.");
    }
  },

  // -------------------------------------------------------------------
  // Activity log — honest action states only. Normal wa.me links give
  // no delivery/read receipts, so we never record "delivered" or "read".
  // -------------------------------------------------------------------
  async logActivity(
    leadId: string,
    action: WhatsAppActivityAction,
    opts?: { templateName?: string; admin?: string }
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("whatsapp_activity").insert({
      lead_id: leadId,
      action: ACTION_TO_DB[action],
      template_name: opts?.templateName || null,
      admin: opts?.admin || null,
    });
    if (error) {
      console.error("whatsappService.logActivity failed:", error);
      throw new Error("Could not record this WhatsApp activity.");
    }
  },

  async listActivity(leadId: string): Promise<WhatsAppActivity[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_activity")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("whatsappService.listActivity failed:", error);
      throw new Error("Could not load WhatsApp activity.");
    }
    return (data ?? []).map(mapRowToActivity);
  },

  /** Total logged actions across every lead, for the WhatsApp Center's
   *  simple analytics — a real count of what admins actually did, not a
   *  delivery/read metric (which normal wa.me links cannot provide). */
  async totalActionsCount(): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("whatsapp_activity")
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error("whatsappService.totalActionsCount failed:", error);
      return 0;
    }
    return count ?? 0;
  },

  // -------------------------------------------------------------------
  // Official Meta WhatsApp Business Cloud API — NOT active.
  //
  // Everything above (templates, activity log) works today with normal
  // wa.me click-to-chat links opened client-side; nothing below is
  // called anywhere in the current UI. This is the prepared server-side
  // entry point for when real Meta credentials are configured:
  //   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
  //   WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_API_VERSION
  // (all server-only — never read from client code). Until those are
  // set, isMetaApiConfigured() is false and sendWhatsAppMessage() throws
  // rather than pretending to send anything.
  // -------------------------------------------------------------------
  isMetaApiConfigured(): boolean {
    return !!(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    );
  },

  /** Would call Meta's Graph API (POST /{PHONE_NUMBER_ID}/messages) to
   *  send an approved template or session message server-side. Real
   *  delivery/read status would then arrive via the webhook at
   *  /api/whatsapp/webhook, not from this call directly. */
  async sendWhatsAppMessage(): Promise<never> {
    throw new Error(
      "Meta WhatsApp Business Cloud API is not configured yet. Add WHATSAPP_ACCESS_TOKEN, " +
        "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_BUSINESS_ACCOUNT_ID to enable server-side sending. " +
        "Until then, use the wa.me click-to-chat links throughout the admin dashboard."
    );
  },
};
