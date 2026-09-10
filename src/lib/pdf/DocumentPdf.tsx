import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const RED = "#C81E2C";
const DARK_RED = "#7A1219";
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const BORDER = "#E5E5E5";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: INK, paddingTop: 60, paddingBottom: 60, paddingHorizontal: 40 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 46,
    paddingHorizontal: 40,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: RED,
  },
  headerBrand: { fontSize: 12, fontWeight: 700, color: DARK_RED },
  headerSub: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  headerDocNumber: { fontSize: 9, fontWeight: 700, color: INK },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    paddingHorizontal: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 7.5, color: MUTED },
  h1: { fontSize: 18, fontWeight: 700, color: INK, marginBottom: 4 },
  muted: { color: MUTED, fontSize: 9 },
  section: { marginTop: 16 },
  h2: { fontSize: 11, fontWeight: 700, color: DARK_RED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 6, paddingHorizontal: 10 },
  tableRowLast: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10 },
  tableLabel: { fontSize: 9, color: MUTED, width: "45%" },
  tableValue: { fontSize: 9.5, fontWeight: 700, color: INK, width: "55%", textAlign: "right" },
  bodyText: { fontSize: 9.5, color: INK, lineHeight: 1.6, marginBottom: 8 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signBox: { width: "45%", borderTopWidth: 1, borderTopColor: INK, paddingTop: 6 },
  signLabel: { fontSize: 8.5, color: MUTED },
  disclaimer: { marginTop: 24, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 10, backgroundColor: "#FAFAFA" },
  disclaimerText: { fontSize: 7.5, color: MUTED, lineHeight: 1.5 },
});

export interface PdfTableSection {
  heading: string;
  rows: { label: string; value: string }[];
}

/** A single, flexible, branded document layout reused for every
 *  generated document type (booking forms, agreements, receipts —
 *  sections 23-26, 35-36) — real field data only, plus optional
 *  admin-authored body paragraphs from a document_templates row with
 *  {{variables}} already interpolated by the caller. */
export function DocumentPdf({
  documentTitle,
  documentNumber,
  generatedDate,
  sections,
  bodyParagraphs,
  showSignatureBlock,
  legalDisclaimer,
  businessName,
  businessAddress,
  businessPhone,
  businessEmail,
}: {
  documentTitle: string;
  documentNumber: string;
  generatedDate: string;
  sections: PdfTableSection[];
  bodyParagraphs?: string[];
  showSignatureBlock?: boolean;
  legalDisclaimer?: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerBrand}>{businessName}</Text>
            <Text style={styles.headerSub}>Estate &amp; Builders</Text>
          </View>
          <Text style={styles.headerDocNumber}>{documentNumber}</Text>
        </View>

        <Text style={styles.h1}>{documentTitle}</Text>
        <Text style={styles.muted}>Generated: {generatedDate}</Text>

        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.h2}>{section.heading}</Text>
            <View style={styles.table}>
              {section.rows.map((row, i) => (
                <View key={row.label} style={i === section.rows.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={styles.tableLabel}>{row.label}</Text>
                  <Text style={styles.tableValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {bodyParagraphs && bodyParagraphs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Terms</Text>
            {bodyParagraphs.map((p, i) => (
              <Text key={i} style={styles.bodyText}>
                {p}
              </Text>
            ))}
          </View>
        )}

        {showSignatureBlock && (
          <View style={styles.signRow}>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>Customer Signature</Text>
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>{businessName} Representative</Text>
            </View>
          </View>
        )}

        {legalDisclaimer && (
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>{legalDisclaimer}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {businessName} — {businessAddress}
          </Text>
          <Text style={styles.footerText}>
            {businessPhone} — {businessEmail}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
