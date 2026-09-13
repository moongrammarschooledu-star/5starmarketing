import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MAINTENANCE_REQUEST_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import { RequestStatusActions } from "@/components/admin/maintenance/RequestStatusActions";
import { MaintenanceCommentThread } from "@/components/admin/maintenance/MaintenanceCommentThread";
import { CreateWorkOrderInline } from "@/components/admin/maintenance/CreateWorkOrderInline";

export const dynamic = "force-dynamic";

export default async function MaintenanceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("maintenance");
  const { id } = await params;
  const [request, comments, workOrders] = await Promise.all([
    maintenanceRequestService.getById(id),
    maintenanceRequestService.listComments(id, true),
    maintenanceWorkOrderService.listByRequest(id),
  ]);
  if (!request) notFound();

  return (
    <div>
      <Link href="/admin/maintenance/requests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{request.requestNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {request.propertyTitle ?? "Property"} {request.unitNumber ? `· Unit ${request.unitNumber}` : ""} · {request.category}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      {(request.slaResponseBreached || request.slaResolutionBreached) && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">SLA breached on this request.</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-ink">{request.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label="Customer" value={request.customerName ?? "—"} />
          <Meta label="Preferred Visit" value={request.preferredVisitTime ? new Date(request.preferredVisitTime).toLocaleString("en-GB") : "—"} />
          <Meta label="Response Due" value={request.slaResponseDueAt ? new Date(request.slaResponseDueAt).toLocaleString("en-GB") : "—"} />
          <Meta label="Resolution Due" value={request.slaResolutionDueAt ? new Date(request.slaResolutionDueAt).toLocaleString("en-GB") : "—"} />
        </div>
        {request.customerConfirmed && <p className="mt-3 text-xs font-semibold text-success">Customer confirmed completion{request.customerRating ? ` — rated ${request.customerRating}/5` : ""}.</p>}
        {request.reportedUnresolved && <p className="mt-3 text-xs font-semibold text-primary">Customer reported this unresolved.</p>}
        {request.customerFeedback && <p className="mt-2 rounded-lg bg-surface-muted p-3 text-xs text-muted">&ldquo;{request.customerFeedback}&rdquo;</p>}
      </div>

      <div className="mt-4">
        <RequestStatusActions requestId={request.id} currentStatus={request.status} allowed={MAINTENANCE_REQUEST_ALLOWED_TRANSITIONS[request.status]} />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-ink">Work Orders</h2>
        </div>
        <div className="mt-3 space-y-2">
          {workOrders.map((w) => (
            <Link key={w.id} href={`/admin/maintenance/work-orders/${w.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-primary">
              <div>
                <p className="text-sm font-semibold text-ink">{w.workOrderNumber}</p>
                <p className="text-xs text-muted">{w.vendorName ?? w.technicianName ?? "Unassigned"}</p>
              </div>
              <StatusBadge status={w.status} />
            </Link>
          ))}
          {workOrders.length === 0 && <p className="text-sm text-muted">No work orders yet for this request.</p>}
        </div>
        <div className="mt-4">
          <CreateWorkOrderInline requestId={request.id} propertyId={request.propertyId} unitId={request.unitId} priority={request.priority} description={`Re: ${request.requestNumber} — ${request.description}`} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Comments</h2>
        <MaintenanceCommentThread requestId={request.id} comments={comments} />
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-muted p-4 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> Internal costs, vendor pricing and private notes on linked work orders are never shown to the customer — only status, schedule and their own charge (if any).
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
