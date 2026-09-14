import { customerService } from "@/services/customerService";
import { supportCategoryService } from "@/services/supportCategoryService";
import { NewTicketForm } from "@/components/support/NewTicketForm";

export const metadata = { title: "New Ticket" };
export const dynamic = "force-dynamic";

export default async function NewSupportTicketPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;
  const categories = await supportCategoryService.list(true);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Create Support Ticket</h1>
      <p className="mt-1 text-sm text-muted">Tell us what&apos;s going on — you can attach supporting files once the ticket is created.</p>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <NewTicketForm categories={categories.filter((c) => c.code !== "COMPLAINT")} mode="customer" />
      </div>
    </div>
  );
}
