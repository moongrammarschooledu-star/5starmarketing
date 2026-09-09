import { redirect } from "next/navigation";

// Inquiries were superseded by the full Lead Management CRM at /admin/leads.
// Keep this route so old bookmarks/links still land somewhere useful.
export default function AdminInquiriesRedirect() {
  redirect("/admin/leads");
}
