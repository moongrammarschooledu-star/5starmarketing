/* eslint-disable jsx-a11y/alt-text -- this is react-pdf's own <Image>, which has no alt attribute */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_ASPECT, LOGO_DATA_URI } from "./logoData";
import type { SheetData, SheetPoint } from "./detailSheets";

// A clean, black-on-white A4 sheet meant to be printed and filed as an office
// record: company header, record line, short bullet points under plain
// headings, a space for signatures, and page numbers. Only a thin red line of
// colour, so it prints well on any printer.

const RED = "#C81E2C";
const INK = "#1A1A1A";
const MUTED = "#555555";
const LINE = "#BBBBBB";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10.5, color: INK, paddingTop: 92, paddingBottom: 56, paddingHorizontal: 40, lineHeight: 1.35 },
  header: { position: "absolute", top: 24, left: 40, right: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: RED, paddingBottom: 8 },
  logo: { width: 78, height: 78 / LOGO_ASPECT },
  company: { textAlign: "right" },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  companyLine: { fontSize: 8.5, color: MUTED },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6 },
  footerText: { fontSize: 8, color: MUTED },
  kind: { fontFamily: "Helvetica-Bold", fontSize: 9, color: RED, letterSpacing: 1 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 17, marginTop: 4 },
  recordRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, borderWidth: 1, borderColor: LINE, padding: 6 },
  recordCell: { marginRight: 22, fontSize: 9 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 14, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: INK, textTransform: "uppercase", letterSpacing: 0.6 },
  point: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, fontFamily: "Helvetica-Bold" },
  pointText: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  sign: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  signBox: { width: "30%", borderTopWidth: 1, borderTopColor: INK, paddingTop: 3, fontSize: 8.5, color: MUTED },
});

function Point({ p }: { p: SheetPoint }) {
  return (
    <View style={styles.point} wrap={false}>
      <Text style={styles.bullet}>{"•"}</Text>
      {typeof p === "string" ? (
        <Text style={styles.pointText}>{p}</Text>
      ) : (
        <Text style={styles.pointText}>
          <Text style={styles.bold}>{p.label}: </Text>
          {p.value}
        </Text>
      )}
    </View>
  );
}

export function DetailSheetDocument({
  sheet,
  printedOn,
  printedBy,
}: {
  sheet: SheetData;
  printedOn: string;
  printedBy: string;
}) {
  return (
    <Document title={`${sheet.title} - office record`} author="5STAR.M Estate & Builders">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={LOGO_DATA_URI} style={styles.logo} />
          <View style={styles.company}>
            <Text style={styles.companyName}>5STAR.M Estate &amp; Builders</Text>
            <Text style={styles.companyLine}>1037-E-1 Johar Town, Lahore, Pakistan</Text>
            <Text style={styles.companyLine}>0308-6010310  |  5starmestate.com</Text>
          </View>
        </View>

        <Text style={styles.kind}>{sheet.kind}</Text>
        <Text style={styles.title}>{sheet.title}</Text>
        <View style={styles.recordRow}>
          {sheet.recordNo ? (
            <Text style={styles.recordCell}>
              <Text style={styles.bold}>Record no.: </Text>
              {sheet.recordNo}
            </Text>
          ) : null}
          <Text style={styles.recordCell}>
            <Text style={styles.bold}>Printed on: </Text>
            {printedOn}
          </Text>
          <Text style={styles.recordCell}>
            <Text style={styles.bold}>Printed by: </Text>
            {printedBy}
          </Text>
        </View>

        {sheet.sections.map((s) => (
          <View key={s.heading}>
            <Text style={styles.h2} minPresenceAhead={40}>
              {s.heading}
            </Text>
            {s.points.map((p, i) => (
              <Point key={i} p={p} />
            ))}
          </View>
        ))}

        <View style={styles.sign} wrap={false}>
          <Text style={styles.signBox}>Prepared by</Text>
          <Text style={styles.signBox}>Checked by</Text>
          <Text style={styles.signBox}>Date</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Confidential - for office record only. Do not share outside the company.</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
