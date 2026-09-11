import "server-only";
import { createClient } from "@/lib/supabase/server";
import { communicationService } from "./communicationService";
import { dealService } from "./dealService";
import { appointmentService } from "./appointmentService";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

/** Payment/installment reminders (sections 89-90) — reuses the SAME
 *  communication infrastructure as everything else, never a separate
 *  sender. Opportunistic sweep (no background job runner in this
 *  deployment, same established pattern as followUpService.markOverdue
 *  and automationService.processQueuedEvents) — called from the
 *  overdue-payments page. De-duplicated by only sending once per
 *  calendar day per deal, checked against that deal's own conversation
 *  last_message_at, so re-running this sweep never spams the customer. */
export async function sweepPaymentReminders(): Promise<number> {
  const overdue = await dealService.listOverduePayments();
  if (overdue.length === 0) return 0;

  const byDeal = new Map<string, typeof overdue>();
  for (const row of overdue) {
    const list = byDeal.get(row.deal.id) ?? [];
    list.push(row);
    byDeal.set(row.deal.id, list);
  }

  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let sent = 0;
  for (const [dealId, rows] of byDeal) {
    const deal = rows[0].deal;
    if (!deal.customerId) continue;

    const { data: recent } = await supabase
      .from("communication_conversations")
      .select("id, last_message_at")
      .eq("deal_id", dealId)
      .eq("channel", "WHATSAPP")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.last_message_at && new Date(recent.last_message_at) >= todayStart) continue; // Already reminded today.

    const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);
    const body = `Assalam-o-Alaikum ${deal.customerName ?? ""}, this is 5STAR.M Estate & Builders — ${rows.length} installment(s) on ${deal.dealNumber} are overdue, ${formatPKR(totalOutstanding)} outstanding. Please contact us to arrange payment.`;

    const conversation = await communicationService.findOrCreateForCustomer(deal.customerId, "WHATSAPP", {
      dealId,
      counterpartName: deal.customerName,
      counterpartPhone: deal.customerWhatsapp || deal.customerPhone,
    });
    const result = await communicationService.composeAndSend(
      { conversationId: conversation.id, channel: "WHATSAPP", direction: "OUTBOUND", body, isMarketing: false, recipientPhone: deal.customerWhatsapp || deal.customerPhone },
      { name: "System" }
    );
    if (result.status !== "FAILED") sent += 1;
  }
  return sent;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Site-visit reminders (section 92) — a 24-hour-ahead reminder for
 *  every Confirmed appointment tomorrow. Same-day reminders are
 *  intentionally NOT auto-swept (there's no cron to fire one at a
 *  specific same-day time without a real scheduler) — an admin can
 *  still send one manually from the appointment detail page. De-
 *  duplicated the same way as payment reminders: skipped if this
 *  appointment's own conversation already has a message today. */
export async function sweepSiteVisitReminders(): Promise<number> {
  const appointments = await appointmentService.listAll({ date: tomorrowISO(), status: "Confirmed" });
  if (appointments.length === 0) return 0;

  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let sent = 0;
  for (const appt of appointments) {
    const { data: recent } = await supabase
      .from("communication_conversations")
      .select("id, last_message_at")
      .eq("site_visit_id", appt.id)
      .eq("channel", "WHATSAPP")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.last_message_at && new Date(recent.last_message_at) >= todayStart) continue;

    const phone = appt.whatsapp || appt.phone;
    if (!phone) continue;
    const body = `Assalam-o-Alaikum ${appt.name}, this is a reminder from 5STAR.M Estate & Builders — your site visit for ${appt.propertyTitle} is confirmed for ${formatDateOnly(appt.appointmentDate)} at ${appt.appointmentTime}. See you then!`;

    let conversation;
    if (appt.customerId) {
      conversation = await communicationService.findOrCreateForCustomer(appt.customerId, "WHATSAPP", { siteVisitId: appt.id, propertyId: appt.propertyId, counterpartName: appt.name, counterpartPhone: phone });
    } else if (appt.leadId) {
      conversation = await communicationService.findOrCreateForLead(appt.leadId, "WHATSAPP", { siteVisitId: appt.id, propertyId: appt.propertyId, counterpartName: appt.name, counterpartPhone: phone });
    } else {
      conversation = await communicationService.create({ channel: "WHATSAPP", siteVisitId: appt.id, propertyId: appt.propertyId, counterpartName: appt.name, counterpartPhone: phone });
    }
    const result = await communicationService.composeAndSend({ conversationId: conversation.id, channel: "WHATSAPP", direction: "OUTBOUND", body, isMarketing: false, recipientPhone: phone }, { name: "System" });
    if (result.status !== "FAILED") sent += 1;
  }
  return sent;
}
