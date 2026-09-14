import { notFound } from "next/navigation";
import Link from "next/link";
import { legalCaseService } from "@/services/legalCaseService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LegalCaseControls } from "@/components/admin/legal/LegalCaseControls";

export const dynamic = "force-dynamic";

export default async function LegalCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("legal");
  const { id } = await params;
  const legalCase = await legalCaseService.getById(id);
  if (!legalCase) notFound();

  const [events, admin] = await Promise.all([legalCaseService.listEvents(id), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageLegal(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {legalCase.caseNumber} — {legalCase.title}
          </h1>
          {legalCase.propertyId && (
            <Link href={`/admin/legal/properties/${legalCase.propertyId}`} className="text-sm text-primary hover:underline">
              {legalCase.propertyTitle}
            </Link>
          )}
        </div>
        <StatusBadge status={legalCase.status} />
      </div>

      <div className="mt-4">
        <LegalCaseControls legalCase={legalCase} canManage={canManage} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Case Timeline</h2>
        <div className="mt-3 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{e.eventType}</span>
                <span className="text-xs text-muted">{e.eventDate}</span>
              </div>
              <p className="mt-1 text-sm text-ink">{e.description}</p>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-muted">No events recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
