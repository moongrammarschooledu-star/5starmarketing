import { redirect } from "next/navigation";

// "Requests" is simply every non-complaint ticket — rather than a
// duplicate list page, this redirects to the same Tickets list with
// its own excludeComplaints filter already applied.
export default function SupportRequestsPage() {
  redirect("/admin/support/tickets?excludeComplaints=1");
}
