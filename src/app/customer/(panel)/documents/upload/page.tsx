import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { documentService } from "@/services/documentService";
import { CustomerDocumentUploadForm } from "@/components/customer/CustomerDocumentUploadForm";

export const metadata = { title: "Upload Document" };
export const dynamic = "force-dynamic";

export default async function CustomerDocumentUploadPage() {
  const types = await documentService.listTypes(true);

  return (
    <div>
      <Link href="/customer/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Documents
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Upload Document</h1>
        <p className="mt-1 text-sm text-muted">Share an ID, address proof, or a document our team has requested from you.</p>
      </div>
      <div className="mt-6 max-w-xl">
        <CustomerDocumentUploadForm types={types} />
      </div>
    </div>
  );
}
