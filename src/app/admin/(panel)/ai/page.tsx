import Link from "next/link";
import { LayoutDashboard, MessageSquare, Zap, BookOpen, Lightbulb, History, Settings, ArrowRight, Bot } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { aiConfigService } from "@/services/aiConfigService";

export const dynamic = "force-dynamic";

export default async function AiIndexPage() {
  await requireSection("ai");
  const global = await aiConfigService.getGlobal();
  const enabled = global?.enabled ?? false;

  return (
    <div>
      <div className="flex items-center gap-3">
        <Bot className="h-7 w-7 text-primary" />
        <h1 className="font-heading text-2xl font-extrabold text-ink">AI Assistant &amp; Automation</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        A role-aware assistant across leads, properties, sales, rentals, support, construction, maintenance and
        accounting — read-only by default, with human approval required for any write action.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NavCard href="/admin/ai/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Usage, tool calls, errors." />
        <NavCard href="/admin/ai/chat" icon={MessageSquare} title="Chat" desc="Talk to your role's assistant." />
        <NavCard href="/admin/ai/automations" icon={Zap} title="Automations" desc="Trigger-based AI suggestions." />
        <NavCard href="/admin/ai/knowledge" icon={BookOpen} title="Knowledge Base" desc="Curated sources the AI prefers." />
        <NavCard href="/admin/ai/insights" icon={Lightbulb} title="Smart Insights" desc="Inactivity, SLA risk, overdue items." />
        <NavCard href="/admin/ai/activity" icon={History} title="Activity Log" desc="Every tool call &amp; approval." />
        <NavCard href="/admin/ai/settings" icon={Settings} title="Settings" desc="Enable/disable, permissions, retention." />
      </div>
    </div>
  );
}

function NavCard({ href, icon: Icon, title, desc }: { href: string; icon: typeof LayoutDashboard; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 hover:border-primary">
      <Icon className="h-6 w-6 text-primary" />
      <p className="mt-3 font-heading text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
