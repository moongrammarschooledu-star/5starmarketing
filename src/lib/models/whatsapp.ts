export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type WhatsAppTemplateInput = Pick<WhatsAppTemplate, "name" | "content">;

/** Honest action states only — normal wa.me click-to-chat links give no
 *  delivery/read status, so we never claim "delivered" or "read". */
export type WhatsAppActivityAction = "WhatsApp Opened" | "Follow-Up Required" | "Contacted";

export const whatsappActivityActions: WhatsAppActivityAction[] = [
  "WhatsApp Opened",
  "Follow-Up Required",
  "Contacted",
];

export interface WhatsAppActivity {
  id: string;
  leadId: string;
  action: WhatsAppActivityAction;
  templateName?: string;
  admin?: string;
  createdAt: string;
}

/** Variables a template/message can reference — filled in wherever the
 *  data is available (missing ones are simply left blank). */
export interface WhatsAppTemplateVariables {
  customer_name?: string;
  property_name?: string;
  location?: string;
  price?: string;
  size?: string;
  agent_name?: string;
}

export function fillTemplate(content: string, vars: WhatsAppTemplateVariables): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key as keyof WhatsAppTemplateVariables];
    return value ?? match;
  });
}
