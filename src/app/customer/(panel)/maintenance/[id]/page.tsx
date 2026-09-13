import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { CustomerCommentThread } from "@/components/customer/maintenance/CustomerCommentThread";
import { CustomerCompletionConfirmation } from "@/components/customer/maintenance/CustomerCompletionConfirmation";

export const metadata = { title: "Maintenance Request" };
export const dynamic = "force-dynamic";

export default async function CustomerMaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const request = await maintenanceRequestService.getById(id);
  if (!request || request.customerId !== customer.id) notFound();

  const [workOrders, comments] = await Promise.all([maintenanceWorkOrderService.listCustomerViewByRequest(id), maintenanceRequestService.listComments(id, false)]);

  return (
    <div>
      <Link href="/customer/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{request.requestNumber}</h1>
          <p className="mt-1 text-sm text-muted">{request.category}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-ink">{request.description}</p>
        {request.preferredVisitTime && <p className="mt-2 text-xs text-muted">Preferred visit: {new Date(request.preferredVisitTime).toLocaleString("en-GB")}</p>}
      </div>

      {workOrders.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-bold text-ink">Work Progress</h2>
          <div className="mt-3 space-y-2">
            {workOrders.map((w) => (
              <div key={w.id} className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{w.technicianName ?? w.vendorName ?? "Assigned technician"}</p>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                  {w.scheduledDate && <span>Scheduled: {new Date(w.scheduledDate).toLocaleDateString("en-GB")}</span>}
                  {w.completedDate && <span>Completed: {new Date(w.completedDate).toLocaleDateString("en-GB")}</span>}
                  {w.customerCharge != null && <span>Charge: {formatPKR(w.customerCharge)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(request.status === "COMPLETED" || request.status === "CLOSED") && !request.customerConfirmed && (
        <div className="mt-6">
          <CustomerCompletionConfirmation requestId={request.id} />
        </div>
      )}
      {request.customerConfirmed && <p className="mt-6 text-sm font-semibold text-success">You confirmed this request as completed{request.customerRating ? ` (rated ${request.customerRating}/5)` : ""}.</p>}
      {request.reportedUnresolved && request.status === "VERIFICATION_REQUIRED" && <p className="mt-6 text-sm font-semibold text-primary">You reported this as unresolved — our team will follow up.</p>}

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Comments</h2>
        <CustomerCommentThread requestId={request.id} comments={comments} />
      </div>
    </div>
  );
}
