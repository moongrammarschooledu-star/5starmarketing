import Link from "next/link";
import { MessageCircle, Mail, Smartphone, Users as UsersIcon, Globe, Bell } from "lucide-react";
import type { Conversation, CommChannel } from "@/lib/models/communication";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";

const CHANNEL_ICON: Record<CommChannel, typeof MessageCircle> = {
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  SMS: Smartphone,
  INTERNAL: UsersIcon,
  PORTAL: Globe,
  SYSTEM: Bell,
};

export function ConversationList({
  conversations,
  total,
  page,
  totalPages,
  unreadCounts,
  basePath,
}: {
  conversations: Conversation[];
  total: number;
  page: number;
  totalPages: number;
  unreadCounts: Map<string, number>;
  basePath: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">{total} conversation(s)</p>
      <div className="mt-3 space-y-2">
        {conversations.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">No conversations match those filters.</p>}
        {conversations.map((c) => {
          const Icon = CHANNEL_ICON[c.channel];
          const unread = unreadCounts.get(c.id) ?? 0;
          const name = c.leadName || c.customerName || c.counterpartName || "Unknown Contact";
          return (
            <Link key={c.id} href={`${basePath}/${c.id}`} className={`flex items-start gap-3 rounded-2xl border p-4 hover:border-primary ${unread > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}>
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate font-bold ${unread > 0 ? "text-ink" : "text-ink"}`}>{name}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{c.lastMessagePreview || "No messages yet."}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {c.propertyTitle && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-muted">{c.propertyTitle}</span>}
                  {c.dealNumber && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-muted">{c.dealNumber}</span>}
                  {c.assignedAgentName ? (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-muted">{c.assignedAgentName}</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600">Unassigned</span>
                  )}
                  {c.isUnmatched && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">Unmatched</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {c.priority !== "NORMAL" && <StatusBadge status={c.priority} />}
                {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{unread}</span>}
              </div>
            </Link>
          );
        })}
      </div>
      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
