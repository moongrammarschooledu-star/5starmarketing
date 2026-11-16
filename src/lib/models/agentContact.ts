// A real estate agent / dealer we want to promote the website to and share
// properties with. Private staff data - never shown on the public site.

export const agentStatuses = ["New", "Contacted", "Interested", "Partner", "Not interested"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export interface AgentContact {
  id: string;
  name: string;
  /** The agent's office or company. */
  agency?: string;
  phone: string;
  whatsapp?: string;
  /** Areas they work in, free text. */
  area?: string;
  remarks?: string;
  status: AgentStatus;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentContactInput = Omit<AgentContact, "id" | "lastContactedAt" | "createdAt" | "updatedAt">;
