import { Phone, Mail, Heart, MessageSquare } from "lucide-react";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";

export const dynamic = "force-dynamic";

export default async function AgentCustomersPage() {
  const admin = await profileService.getCurrentAdmin();
  const customers = admin ? await customerService.listForAgent(admin.id) : [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Customers</h1>
      <p className="mt-1 text-sm text-muted">Customers connected to your own assigned leads.</p>

      <div className="mt-5 space-y-3">
        {customers.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold text-ink">{c.fullName}</p>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                <Heart className="h-3.5 w-3.5 text-primary" /> {c.savedPropertiesCount}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {c.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" /> {c.phone}
                </span>
              )}
              {c.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {c.email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" /> {c.inquiryCount} inquiries
              </span>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            No customers connected to your assigned leads yet.
          </p>
        )}
      </div>
    </div>
  );
}
