import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { PropertyInspection, InspectionResult, PropertyDefect } from "@/lib/models/maintenance";

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
  h2: { fontSize: 13, fontWeight: 700, color: DARK_RED, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  muted: { color: MUTED },
  cardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: { width: "31%", borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 10 },
  cardLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
  cardValue: { fontSize: 12, fontWeight: 700, color: INK },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 14 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 6, paddingHorizontal: 10 },
  tableRowLast: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10 },
  catLabel: { fontSize: 9, fontWeight: 700, color: INK, width: "30%" },
  itemLabel: { fontSize: 9, color: INK, width: "30%" },
  condLabel: { fontSize: 9, color: MUTED, width: "20%" },
  sevLabel: { fontSize: 9, color: MUTED, width: "20%" },
  defectRow: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 8, paddingHorizontal: 10 },
  badge: { fontSize: 8, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3, alignSelf: "flex-start" },
  sevLow: { backgroundColor: "#F1F5F9", color: "#334155" },
  sevMedium: { backgroundColor: "#FEF3C7", color: "#92400E" },
  sevHigh: { backgroundColor: "#FFEDD5", color: "#9A3412" },
  sevCritical: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  disclaimerBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12, backgroundColor: "#FAFAFA" },
  disclaimerText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
});

const SEVERITY_STYLE = { LOW: styles.sevLow, MEDIUM: styles.sevMedium, HIGH: styles.sevHigh, CRITICAL: styles.sevCritical };

export function InspectionReportDocument({
  inspection,
  results,
  defects,
  disclaimerText,
  business,
}: {
  inspection: PropertyInspection;
  results: InspectionResult[];
  defects: PropertyDefect[];
  disclaimerText: string;
  business: { name: string; phone: string; email: string };
}) {
  const grouped = new Map<string, InspectionResult[]>();
  for (const r of results) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  return (
    <Document title={`Inspection Report — ${inspection.propertyTitle ?? "Property"}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>{business.name} — Property Inspection Report</Text>
          <Text style={styles.headerText}>{inspection.inspectionNumber}</Text>
        </View>

        <Text style={styles.h1}>{inspection.propertyTitle ?? "Property Inspection"}</Text>
        <Text style={[styles.muted, { marginBottom: 16 }]}>
          {inspection.inspectionType.replace(/_/g, " ")} · {inspection.completedDate ? new Date(inspection.completedDate).toLocaleDateString("en-GB") : "Date pending"} · Inspector: {inspection.inspectorName ?? "Not assigned"}
        </Text>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Overall Condition</Text>
            <Text style={styles.cardValue}>{inspection.overallCondition?.replace(/_/g, " ") ?? "Not assessed"}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Status</Text>
            <Text style={styles.cardValue}>{inspection.status.replace(/_/g, " ")}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Checklist Items</Text>
            <Text style={styles.cardValue}>{results.length}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Checklist</Text>
        {[...grouped.entries()].map(([category, items]) => (
          <View key={category} style={styles.table} wrap={false}>
            {items.map((item, i) => (
              <View key={item.id} style={i === items.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.catLabel}>{category}</Text>
                <Text style={styles.itemLabel}>{item.item}</Text>
                <Text style={styles.condLabel}>{item.condition.replace(/_/g, " ")}</Text>
                <Text style={styles.sevLabel}>{item.severity ?? "—"}</Text>
              </View>
            ))}
          </View>
        ))}

        {defects.length > 0 && (
          <>
            <Text style={styles.h2}>Defects &amp; Recommended Actions</Text>
            {defects.map((d) => (
              <View key={d.id} style={styles.defectRow} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 9, fontWeight: 700 }}>
                    {d.category} — {d.location ?? "Location not specified"}
                  </Text>
                  <Text style={[styles.badge, SEVERITY_STYLE[d.severity]]}>{d.severity}</Text>
                </View>
                <Text style={{ fontSize: 9, marginTop: 3 }}>{d.description}</Text>
                {d.recommendedAction && <Text style={[styles.muted, { fontSize: 8, marginTop: 2 }]}>Recommended: {d.recommendedAction}</Text>}
                {d.estimatedCost != null && <Text style={[styles.muted, { fontSize: 8, marginTop: 2 }]}>Estimated repair cost: PKR {Math.round(d.estimatedCost).toLocaleString("en-PK")}</Text>}
              </View>
            ))}
          </>
        )}

        {inspection.recommendations && (
          <>
            <Text style={styles.h2}>Recommendations</Text>
            <Text style={{ fontSize: 9, marginBottom: 14 }}>{inspection.recommendations}</Text>
          </>
        )}

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{disclaimerText}</Text>
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
