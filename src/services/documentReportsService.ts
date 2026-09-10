import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DocumentReportRow {
  key: string;
  label: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface DocumentReportsSummary {
  totalDocuments: number;
  byType: DocumentReportRow[];
  byMonth: { month: string; total: number }[];
  byProject: DocumentReportRow[];
  byProperty: DocumentReportRow[];
  byAgent: DocumentReportRow[];
  byCustomer: DocumentReportRow[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocRow = any;

function bucket(rows: DocRow[], keyOf: (r: DocRow) => string | null | undefined, labelOf: (r: DocRow) => string): DocumentReportRow[] {
  const map = new Map<string, DocumentReportRow>();
  for (const r of rows) {
    const key = keyOf(r);
    if (!key) continue;
    const entry = map.get(key) ?? { key, label: labelOf(r), total: 0, approved: 0, rejected: 0, pending: 0 };
    entry.total += 1;
    if (r.status === "APPROVED") entry.approved += 1;
    else if (r.status === "REJECTED") entry.rejected += 1;
    else if (r.status === "UPLOADED" || r.status === "UNDER_REVIEW") entry.pending += 1;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export const documentReportsService = {
  /** Real, from-data document reporting (section 44/61) — every row comes
   *  straight from the `documents` table, never invented. */
  async summary(): Promise<DocumentReportsSummary> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select(
        "status, document_type, created_at, project_id, projects(name), property_id, properties(title), customer_id, deal_id, document_types(label), deals(agent_id, admin_profiles!deals_agent_id_fkey(name))"
      );
    if (error) {
      console.error("documentReportsService.summary failed:", error);
      return { totalDocuments: 0, byType: [], byMonth: [], byProject: [], byProperty: [], byAgent: [], byCustomer: [] };
    }
    const rows: DocRow[] = data ?? [];

    // Customer names need a separate lookup (customer_id -> auth.users, not a direct FK join).
    const customerIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];
    const customerNames = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase.from("customer_profiles").select("id, full_name").in("id", customerIds);
      for (const c of customers ?? []) customerNames.set(c.id, c.full_name ?? "Customer");
    }

    const monthMap = new Map<string, number>();
    for (const r of rows) {
      const month = String(r.created_at).slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }

    return {
      totalDocuments: rows.length,
      byType: bucket(
        rows,
        (r) => r.document_type,
        (r) => r.document_types?.label ?? r.document_type
      ),
      byMonth: [...monthMap.entries()].map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)),
      byProject: bucket(
        rows,
        (r) => r.project_id,
        (r) => r.projects?.name ?? "Project"
      ),
      byProperty: bucket(
        rows,
        (r) => r.property_id,
        (r) => r.properties?.title ?? "Property"
      ),
      byAgent: bucket(
        rows,
        (r) => r.deals?.agent_id,
        (r) => r.deals?.admin_profiles?.name ?? "Agent"
      ),
      byCustomer: bucket(
        rows,
        (r) => r.customer_id,
        (r) => customerNames.get(r.customer_id) ?? "Customer"
      ),
    };
  },
};
