import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { documentTemplateService } from "@/services/documentTemplateService";
import { documentService } from "@/services/documentService";
import { DocumentTemplateManager } from "@/components/admin/documents/DocumentTemplateManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DocumentTemplatesPage() {
  await requireSection("documents");
  const [templates, types] = await Promise.all([documentTemplateService.list(true), documentService.listTypes(true)]);

  return (
    <div>
      <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Document Templates</h1>
        <p className="mt-1 text-sm text-muted">Manage agreement templates used to generate documents with real deal data.</p>
      </div>
      <div className="mt-6">
        <DocumentTemplateManager templates={templates} types={types} />
      </div>
    </div>
  );
}
