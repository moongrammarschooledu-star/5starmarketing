import "server-only";
import { createClient } from "@/lib/supabase/server";
import { communicationService } from "@/services/communicationService";
import { emailProvider, whatsappProvider } from "@/lib/marketing/providers";

/** Best-effort transactional dispatch through the Communication Center
 *  (sections 33, 88-92) — reuses the SAME send infrastructure automation
 *  workflows use, never a separate parallel sender. Picks WhatsApp first
 *  (if configured and the customer hasn't opted out), then Email, else
 *  does nothing external — the in-app notification (notificationService)
 *  remains the guaranteed delivery path regardless. Never blocks the
 *  caller: any failure here is swallowed, exactly like
 *  staffNotificationService/notificationService's own "best-effort"
 *  convention. Transactional (isMarketing: false) — bypasses
 *  marketing_opt_in/Do-Not-Contact but still respects the specific
 *  channel's own opt-in. */
export async function dispatchTransactionalMessage(customerId: string, subject: string, body: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: customer } = await supabase.from("customer_profiles").select("full_name, phone, whatsapp, email, whatsapp_opt_in, email_opt_in").eq("id", customerId).maybeSingle();
    if (!customer) return;

    const whatsappNumber = customer.whatsapp || customer.phone;
    if (whatsappProvider().isConfigured && customer.whatsapp_opt_in && whatsappNumber) {
      const conversation = await communicationService.findOrCreateForCustomer(customerId, "WHATSAPP", { counterpartName: customer.full_name, counterpartPhone: whatsappNumber });
      await communicationService.composeAndSend(
        { conversationId: conversation.id, channel: "WHATSAPP", direction: "OUTBOUND", body, isMarketing: false, recipientPhone: whatsappNumber },
        { name: "System" }
      );
      return;
    }

    if (emailProvider().isConfigured && customer.email_opt_in && customer.email) {
      const conversation = await communicationService.findOrCreateForCustomer(customerId, "EMAIL", { counterpartName: customer.full_name, counterpartEmail: customer.email });
      await communicationService.composeAndSend(
        { conversationId: conversation.id, channel: "EMAIL", direction: "OUTBOUND", subject, body, isMarketing: false, recipientEmail: customer.email },
        { name: "System" }
      );
    }
  } catch (e) {
    console.error("dispatchTransactionalMessage failed (in-app notification is unaffected):", e);
  }
}
