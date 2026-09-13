import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { constructionProjectService } from "@/services/constructionProjectService";
import { constructionProgressService } from "@/services/constructionProgressService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { constructionSiteReportService } from "@/services/constructionSiteReportService";
import { constructionHandoverService } from "@/services/constructionHandoverService";
import { documentService } from "@/services/documentService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CustomerHandoverVerification } from "@/components/customer/construction/CustomerHandoverVerification";
import { CustomerSiteMediaGallery } from "@/components/customer/construction/CustomerSiteMediaGallery";

export const metadata = { title: "Construction Progress" };
export const dynamic = "force-dynamic";

export default async function CustomerConstructionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const project = await constructionProjectService.getById(id);
  if (!project || project.customerId !== customer.id) notFound();

  const [progress, phases, milestones, media, handover, documents] = await Promise.all([
    constructionProgressService.overallProgress(id),
    constructionPhaseService.list(id),
    constructionPhaseService.listMilestones(id),
    constructionSiteReportService.listMedia(id),
    constructionHandoverService.getForProject(id),
    documentService.listByConstructionProject(id),
  ]);
  const approvedDocuments = documents.filter((d) => d.status === "APPROVED" || d.status === "VERIFIED");

  return (
    <div>
      <Link href="/customer/construction" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Construction Progress
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{project.projectName}</h1>
          <p className="mt-1 text-sm text-muted">
            {project.projectNumber} {project.location ? `· ${project.location}` : ""}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Actual Progress" value={`${progress.actualPercent.toFixed(0)}%`} accent />
        <Metric label="Planned Progress" value={progress.plannedPercent != null ? `${progress.plannedPercent.toFixed(0)}%` : "—"} />
        <Metric label="Start Date" value={project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "—"} />
        <Metric label="Planned Completion" value={project.plannedCompletionDate ? new Date(project.plannedCompletionDate).toLocaleDateString("en-GB") : "—"} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Phases</h2>
        <div className="mt-3 space-y-2">
          {phases.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          ))}
          {phases.length === 0 && <p className="text-sm text-muted">No phases published yet.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Milestones</h2>
        <div className="mt-3 space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">{m.name}</p>
                {m.plannedDate && <p className="text-xs text-muted">Planned: {new Date(m.plannedDate).toLocaleDateString("en-GB")}</p>}
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
          {milestones.length === 0 && <p className="text-sm text-muted">No milestones published yet.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Site Photos &amp; Videos</h2>
        <CustomerSiteMediaGallery media={media} />
      </div>

      {handover && handover.status !== "NOT_STARTED" && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-ink">Handover</h2>
          <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Status</p>
              <StatusBadge status={handover.status} />
            </div>
            {handover.practicalCompletionDate && <p className="mt-2 text-xs text-muted">Practical completion: {new Date(handover.practicalCompletionDate).toLocaleDateString("en-GB")}</p>}
            {handover.handoverDate && <p className="mt-1 text-xs text-muted">Handover date: {new Date(handover.handoverDate).toLocaleDateString("en-GB")}</p>}
            {handover.status === "CUSTOMER_VERIFICATION" && !handover.customerVerified && <CustomerHandoverVerification projectId={id} />}
            {handover.customerVerified && <p className="mt-3 text-sm font-semibold text-success">You verified this handover on {handover.customerVerifiedAt ? new Date(handover.customerVerifiedAt).toLocaleDateString("en-GB") : ""}.</p>}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Documents</h2>
        <div className="mt-3 space-y-2">
          {approvedDocuments.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">{d.title}</p>
                <p className="text-xs text-muted">{d.documentTypeLabel ?? d.documentType}</p>
              </div>
              <Link href={`/customer/documents/${d.id}`} className="text-xs font-bold text-primary hover:underline">
                View
              </Link>
            </div>
          ))}
          {approvedDocuments.length === 0 && <p className="text-sm text-muted">No approved documents available yet.</p>}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          Have a question about this project?{" "}
          <Link href="/customer/messages" className="font-bold text-primary hover:underline">
            Send us a message
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
