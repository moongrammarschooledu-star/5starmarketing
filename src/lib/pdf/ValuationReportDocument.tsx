import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { PropertyValuation, ValuationComparable, ValuationSettings } from "@/lib/models/investment";

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
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 7, paddingHorizontal: 10 },
  tableRowLast: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10 },
  tableLabel: { fontSize: 9, color: MUTED, width: "50%" },
  tableValue: { fontSize: 10, fontWeight: 700, color: INK, width: "50%", textAlign: "right" },
  badge: { fontSize: 8, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3 },
  badgeAsking: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  badgeTransaction: { backgroundColor: "#DCFCE7", color: "#166534" },
  compRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 7, alignItems: "center" },
  factorRow: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: RED, marginTop: 4, marginRight: 6 },
  disclaimerBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12, backgroundColor: "#FAFAFA" },
  disclaimerText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
});

function money(currency: string, value: number | undefined | null) {
  if (value == null) return "—";
  return `${currency} ${Math.round(value).toLocaleString("en-PK")}`;
}

export function ValuationReportDocument({
  valuation,
  comparables,
  settings,
  business,
}: {
  valuation: PropertyValuation;
  comparables: ValuationComparable[];
  settings: ValuationSettings;
  business: { name: string; phone: string; email: string };
}) {
  return (
    <Document title={`Valuation Report — ${valuation.propertyTitle ?? "Property"}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>{business.name} — Property Valuation Report</Text>
          <Text style={styles.headerText}>ESTIMATE — NOT A GUARANTEE</Text>
        </View>

        <Text style={styles.h1}>{valuation.propertyTitle ?? "Property Valuation"}</Text>
        <Text style={[styles.muted, { marginBottom: 16 }]}>
          {valuation.location ?? ""} {valuation.propertyType ? `· ${valuation.propertyType}` : ""} · Valuation Date {new Date(valuation.valuationDate).toLocaleDateString("en-GB")} · Version {valuation.version}
        </Text>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Estimated Value</Text>
            <Text style={styles.cardValue}>{money(settings.currency, valuation.finalEstimatedValue)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Valuation Method</Text>
            <Text style={styles.cardValue}>{valuation.valuationMethod.replace(/_/g, " ")}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Confidence Level</Text>
            <Text style={styles.cardValue}>{valuation.confidenceScore}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Property Details</Text>
        <View style={styles.table}>
          <Row label="Area" value={`${valuation.area} ${valuation.areaUnit} (${Math.round(valuation.normalizedAreaSqft)} sqft)`} />
          <Row label="Base Price" value={money(settings.currency, valuation.basePrice)} />
          {valuation.marketAdjustmentPercent != null && <Row label="Market Adjustment" value={`${valuation.marketAdjustmentPercent}%`} />}
          {valuation.rentalEstimateMonthly != null && <Row label="Rental Estimate (monthly)" value={money(settings.currency, valuation.rentalEstimateMonthly)} />}
          {valuation.bedrooms != null && <Row label="Bedrooms" value={String(valuation.bedrooms)} />}
          {valuation.ageYears != null && <Row label="Age (years)" value={String(valuation.ageYears)} />}
          <Row label="Created By" value={valuation.createdByName ?? "—"} last />
        </View>

        <Text style={styles.h2}>Confidence Factors</Text>
        <View style={{ marginBottom: 14 }}>
          {(valuation.confidenceFactors ?? []).map((f, i) => (
            <View key={i} style={styles.factorRow}>
              <View style={styles.bulletDot} />
              <Text style={{ fontSize: 9 }}>{f}</Text>
            </View>
          ))}
          {(valuation.confidenceFactors ?? []).length === 0 && <Text style={[styles.muted, { fontSize: 9 }]}>No confidence factors recorded.</Text>}
        </View>

        {comparables.length > 0 && (
          <>
            <Text style={styles.h2}>Comparable Properties (Approved)</Text>
            <View style={styles.table}>
              {comparables.map((c, i) => (
                <View key={c.id} style={i === comparables.length - 1 ? styles.tableRowLast : styles.compRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: 700 }}>{c.title ?? "Comparable"}</Text>
                    <Text style={[styles.muted, { fontSize: 8 }]}>{c.location ?? "—"} · {c.propertyType ?? "—"}</Text>
                  </View>
                  <Text style={[styles.badge, c.isTransaction ? styles.badgeTransaction : styles.badgeAsking]}>{c.isTransaction ? "CONFIRMED TRANSACTION" : "ASKING"}</Text>
                  <Text style={{ fontSize: 10, fontWeight: 700, marginLeft: 10, width: 90, textAlign: "right" }}>{money(settings.currency, c.price)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {valuation.assumptions && (
          <>
            <Text style={styles.h2}>Assumptions</Text>
            <Text style={{ fontSize: 9, marginBottom: 14 }}>{valuation.assumptions}</Text>
          </>
        )}

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{settings.disclaimerText}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{business.name} · {business.phone} · {business.email}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{value}</Text>
    </View>
  );
}
