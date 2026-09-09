"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Lead, LeadPropertyInfo } from "@/lib/models/lead";
import type { WhatsAppTemplate } from "@/lib/models/whatsapp";
import { fillTemplate } from "@/lib/models/whatsapp";
import { whatsappUrlFor } from "@/lib/site";
import { logWhatsAppActivityAction } from "@/lib/actions/whatsapp.actions";
import { Modal } from "./Modal";

const CUSTOM = "__custom__";

export function WhatsAppMessageModal({
  lead,
  property,
  templates,
  whatsappNumber,
  agentName,
}: {
  lead: Lead;
  property?: LeadPropertyInfo;
  templates: WhatsAppTemplate[];
  whatsappNumber: string;
  agentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(CUSTOM);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const vars = useMemo(
    () => ({
      customer_name: lead.name,
      property_name: property?.title ?? lead.propertyTitle,
      location: property?.location,
      price: property?.price,
      size: property?.size,
      agent_name: agentName,
    }),
    [lead, property, agentName]
  );

  const defaultMessage = useMemo(
    () =>
      `Assalam-o-Alaikum ${lead.name},\n\nThank you for contacting 5STAR.M Estate & Builders regarding ${
        vars.property_name ?? "your inquiry"
      }.\n\nOur property consultant will assist you with the complete details.\n\nRegards,\n5STAR.M Estate & Builders`,
    [lead.name, vars.property_name]
  );

  const whatsappNumberForLead = (lead.whatsapp || lead.phone || "").replace(/[^0-9]/g, "");
  const canSend = whatsappNumberForLead.length >= 6;

  function openModal() {
    setTemplateId(CUSTOM);
    setMessage(defaultMessage);
    setOpen(true);
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    if (id === CUSTOM) {
      setMessage(defaultMessage);
      return;
    }
    const template = templates.find((t) => t.id === id);
    if (template) setMessage(fillTemplate(template.content, vars));
  }

  async function handleOpenWhatsApp() {
    setSending(true);
    const templateName = templateId === CUSTOM ? undefined : templates.find((t) => t.id === templateId)?.name;
    try {
      await logWhatsAppActivityAction(lead.id, "WhatsApp Opened", templateName);
    } catch (e) {
      console.error("Failed to log WhatsApp activity:", e);
    }
    setSending(false);
    setOpen(false);
    window.open(whatsappUrlFor(lead.whatsapp || lead.phone || whatsappNumber, message), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={!canSend}
        className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp Customer
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="WhatsApp Message Preview">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-muted p-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Customer</div>
              <div className="font-semibold text-ink">{lead.name}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Property</div>
              <div className="font-semibold text-ink">{vars.property_name ?? "General inquiry"}</div>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Template</span>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
            >
              <option value={CUSTOM}>Custom message</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-ink/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={sending || !message.trim()}
              className="flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" /> Open WhatsApp
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
