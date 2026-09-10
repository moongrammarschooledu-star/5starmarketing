import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AgentShell } from "@/components/agent/AgentShell";
import { profileService } from "@/services/profileService";

export const metadata: Metadata = {
  title: {
    default: "Agent Portal",
    template: "%s | 5STAR.M Agent",
  },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AgentPanelLayout({ children }: { children: ReactNode }) {
  let agentId = "";
  let agentName = "Agent";
  try {
    const admin = await profileService.getCurrentAdmin();
    if (admin?.id) agentId = admin.id;
    if (admin?.name) agentName = admin.name;
  } catch (e) {
    console.error("AgentPanelLayout: failed to load current admin:", e);
  }

  return (
    <AgentShell agentId={agentId} agentName={agentName}>
      {children}
    </AgentShell>
  );
}
