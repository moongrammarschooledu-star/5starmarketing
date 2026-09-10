import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { documentChecklistService } from "@/services/documentChecklistService";
import { documentService } from "@/services/documentService";
import { DocumentChecklistManager } from "@/components/admin/documents/DocumentChecklistManager";
import { requireSection } from "@/lib/guard";
import type { DocumentChecklistItem } from "@/lib/models/document";

export const dynamic = "force-dynamic";

export default async function DocumentChecklistsPage() {
  await requireSection("documents");
  const [checklists, types] = await Promise.all([documentChecklistService.list(), documentService.listTypes(true)]);

  const itemsByChecklist: Record<string, DocumentChecklistItem[]> = {};
  await Promise.all(
    checklists.map(async (c) => {
      itemsByChecklist[c.id] = await documentChecklistService.listItems(c.id);
    })
  );

  return (
    <div>
      <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Document Checklists</h1>
        <p className="mt-1 text-sm text-muted">Define which documents are required for different deal and property types.</p>
      </div>
      <div className="mt-6">
        <DocumentChecklistManager checklists={checklists} itemsByChecklist={itemsByChecklist} types={types} />
      </div>
    </div>
  );
}
