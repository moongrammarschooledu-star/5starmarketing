"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RentalApplication, RentalApplicationStatus } from "@/lib/models/rental";
import { RENTAL_APPLICATION_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import { updateRentalApplicationStatusAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export function ApplicationManager({ applications }: { applications: RentalApplication[] }) {
  return (
    <div className="mt-3 space-y-2">
      {applications.map((a) => (
        <ApplicationRow key={a.id} application={a} />
      ))}
      {applications.length === 0 && <p className="text-sm text-muted">No rental applications yet.</p>}
    </div>
  );
}

function ApplicationRow({ application }: { application: RentalApplication }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const allowed = RENTAL_APPLICATION_ALLOWED_TRANSITIONS[application.status];

  function move(status: RentalApplicationStatus) {
    startTransition(async () => {
      try {
        await updateRentalApplicationStatusAction(application.id, status);
        toast.show(`Application moved to ${status.replace(/_/g, " ")}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this application.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {application.applicationNumber} — {application.applicantName}
          </p>
          <p className="text-xs text-muted">
            {application.propertyTitle ?? "—"} {application.proposedRent != null ? `· ${formatPKR(application.proposedRent)}` : ""} {application.requestedMoveInDate ? `· Move-in ${new Date(application.requestedMoveInDate).toLocaleDateString("en-GB")}` : ""}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      {allowed.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {allowed
            .filter((s) => s !== "WITHDRAWN")
            .map((status) => (
              <button key={status} type="button" onClick={() => move(status)} disabled={isPending} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-ink hover:bg-surface-muted">
                {status.replace(/_/g, " ")}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
