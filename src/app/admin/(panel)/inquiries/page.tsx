import { inquiryService } from "@/services/inquiryService";
import { InquiriesTable } from "@/components/admin/InquiriesTable";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  const inquiries = await inquiryService.list();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Inquiries</h1>
      <p className="mt-1 text-sm text-muted">Customer leads from WhatsApp, the contact form and the website.</p>

      <div className="mt-6">
        <InquiriesTable inquiries={inquiries} />
      </div>
    </div>
  );
}
