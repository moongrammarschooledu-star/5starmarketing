import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { OwnershipAllocationSummary, LegalDocument, Encumbrance, DueDiligenceCase, DueDiligenceCompletionScore, PropertyComplianceRecord, PropertyRiskIndicator } from "@/lib/models/legal";

const RED = "#C81E2C";
const DARK_RED = "#7A1219";
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const BORDER = "#E5E5E5";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: INK, paddingTop: 60, paddingBottom: 50, paddingHorizontal: 40 },
  header: { position: "absolute", top: 0, left: 0, right: 0, height: 36, paddingHorizontal: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: RED },
  headerText: { fontSize: 9, fontWeight: 700, color: DARK_RED },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 34, paddingHorizontal: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER },
  footerText: { fontSize: 8, color: MUTED },
  h1: { fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, color: DARK_RED, marginBottom: 8, marginTop: 14, textTransform: "uppercase", letterSpacing: 1 },
  muted: { color: MUTED },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 6, paddingHorizontal: 10, justifyContent: "space-between" },
  rowLast: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, justifyContent: "space-between" },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  badge: { fontSize: 8, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3 },
  badgeVerified: { backgroundColor: "#DCFCE7", color: "#166534" },
  badgePending: { backgroundColor: "#FEF3C7", color: "#92400E" },
  badgeUnverified: { backgroundColor: "#F1F5F9", color: "#334155" },
  badgeReview: { backgroundColor: "#FFEDD5", color: "#9A3412" },
  badgeNA: { backgroundColor: "#F1F5F9", color: "#6B6B6B" },
  disclaimerBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12, backgroundColor: "#FAFAFA", marginTop: 14 },
  disclaimerText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
});

function badgeStyleFor(label: string) {
  if (label === "VERIFIED") return styles.badgeVerified;
  if (label === "PENDING") return styles.badgePending;
  if (label === "REQUIRES REVIEW") return styles.badgeReview;
  if (label === "NOT APPLICABLE") return styles.badgeNA;
  return styles.badgeUnverified;
}

/** Never converts "pending" into "verified" — every label here is
 *  taken directly from the underlying record's own real status. */
function StatusBadge({ label }: { label: string }) {
  return (
    <Text style={[styles.badge, badgeStyleFor(label)]}>{label}</Text>
  );
}

const DISCLAIMER =
  "This Property Legal File is generated from records entered into this system only. It is NOT a title report, government clearance, or legal opinion, and it does NOT replace a licensed lawyer, solicitor, notary, or the relevant government land/registration authority. Every status shown (VERIFIED, PENDING, UNVERIFIED, REQUIRES REVIEW, or NOT APPLICABLE) reflects only what has actually been recorded or verified in this system as of the generation date below. Checklist completion is not the same as legal clearance. Always seek independent professional and legal advice before relying on this document for any transaction decision.";

export function PropertyLegalFileDocument({
  propertyTitle,
  generatedAt,
  ownership,
  documents,
  encumbrances,
  dueDiligenceCases,
  completionScores,
  compliance,
  riskIndicator,
  business,
}: {
  propertyTitle: string;
  generatedAt: string;
  ownership: OwnershipAllocationSummary;
  documents: LegalDocument[];
  encumbrances: Encumbrance[];
  dueDiligenceCases: DueDiligenceCase[];
  completionScores: Record<string, DueDiligenceCompletionScore>;
  compliance: PropertyComplianceRecord[];
  riskIndicator: PropertyRiskIndicator;
  business: { name: string; phone: string; email: string };
}) {
  return (
    <Document title={`Property Legal File — ${propertyTitle}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>{business.name} — Property Legal File</Text>
          <Text style={styles.headerText}>{generatedAt}</Text>
        </View>

        <Text style={styles.h1}>{propertyTitle}</Text>
        <Text style={styles.muted}>Generated {generatedAt} — for internal/authorized reference only.</Text>

        <Text style={styles.h2}>Ownership</Text>
        {ownership.records.length === 0 ? (
          <Text style={styles.muted}>No ownership records on file.</Text>
        ) : (
          <>
            <View style={styles.table}>
              {ownership.records.map((r, i) => (
                <View key={r.id} style={i === ownership.records.length - 1 ? styles.rowLast : styles.row}>
                  <Text>
                    {r.ownerName} — {r.ownershipSharePercent}% ({r.ownershipType}) — {r.status}
                  </Text>
                  <StatusBadge label={r.verificationStatus === "VERIFIED" ? "VERIFIED" : r.verificationStatus === "REQUIRES_REVIEW" ? "REQUIRES REVIEW" : "UNVERIFIED"} />
                </View>
              ))}
            </View>
            <Text style={[styles.muted, { fontSize: 8, marginTop: 4 }]}>
              Allocation on record: {ownership.totalActiveSharePercent}% {ownership.allocationComplete ? "(complete)" : "— ALLOCATION INCOMPLETE, do not assume the remainder is accounted for"}
            </Text>
          </>
        )}

        <Text style={styles.h2}>Documents</Text>
        {documents.length === 0 ? (
          <Text style={styles.muted}>No legal documents on file.</Text>
        ) : (
          <View style={styles.table}>
            {documents.map((d, i) => {
              const label = d.documentStatus === "VERIFIED" || d.documentStatus === "APPROVED" ? "VERIFIED" : d.documentStatus === "REJECTED" ? "REQUIRES REVIEW" : d.documentStatus === "EXPIRED" ? "REQUIRES REVIEW" : "PENDING";
              return (
                <View key={d.id} style={i === documents.length - 1 ? styles.rowLast : styles.row}>
                  <Text>
                    {d.documentTitle} ({d.copyType.replace(/_/g, " ")})
                  </Text>
                  <StatusBadge label={label} />
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.h2}>Encumbrances</Text>
        {encumbrances.length === 0 ? (
          <Text style={styles.muted}>No encumbrances recorded — this means none is on record here, NOT that the property has been verified encumbrance-free.</Text>
        ) : (
          <View style={styles.table}>
            {encumbrances.map((e, i) => (
              <View key={e.id} style={i === encumbrances.length - 1 ? styles.rowLast : styles.row}>
                <Text>
                  {e.encumbranceType.replace(/_/g, " ")} {e.holderName ? `— ${e.holderName}` : ""} ({e.status})
                </Text>
                <StatusBadge label={e.verificationStatus === "VERIFIED" ? "VERIFIED" : e.verificationStatus === "REQUIRES_REVIEW" ? "REQUIRES REVIEW" : "UNVERIFIED"} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Due Diligence</Text>
        {dueDiligenceCases.length === 0 ? (
          <Text style={styles.muted}>No due-diligence case on file.</Text>
        ) : (
          <View style={styles.table}>
            {dueDiligenceCases.map((c, i) => {
              const score = completionScores[c.id];
              return (
                <View key={c.id} style={i === dueDiligenceCases.length - 1 ? styles.rowLast : styles.row}>
                  <Text>
                    {c.caseNumber} — {c.status.replace(/_/g, " ")}
                    {score?.checklistCompletionPercent != null ? ` — Checklist ${score.checklistCompletionPercent}% complete (NOT the same as legal clearance)` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.h2}>Compliance</Text>
        {compliance.length === 0 ? (
          <Text style={styles.muted}>No compliance record on file.</Text>
        ) : (
          <View style={styles.table}>
            {compliance.map((r, i) => (
              <View key={r.id} style={i === compliance.length - 1 ? styles.rowLast : styles.row}>
                <Text>Compliance Record</Text>
                <StatusBadge label={r.status === "COMPLIANT" ? "VERIFIED" : r.status === "NON_COMPLIANT" || r.status === "REQUIRES_REVIEW" ? "REQUIRES REVIEW" : "PENDING"} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Internal Risk Indicator</Text>
        <Text>Score: {riskIndicator.riskIndicatorScore} (internal only — not a legal opinion)</Text>
        <Text style={[styles.muted, { fontSize: 8, marginTop: 3 }]}>{riskIndicator.disclaimer}</Text>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {business.name} · {business.phone} · {business.email}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
