/* eslint-disable jsx-a11y/alt-text -- this is react-pdf's own <Image>, which has no alt attribute */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_ASPECT, LOGO_DATA_URI } from "./logoData";

// A short, printable list of properties for the office file: one row per
// property with its name, area, demand (the asking price or rent), size and the
// owner's contact number. Landscape A4, black on white, the column headings
// repeat on every page.

export interface PropertyListRow {
  serialNo: string;
  title: string;
  area: string;
  demand: string;
  size: string;
  /** "Name" and number(s), already cleaned; empty when no owner number is saved. */
  ownerName: string;
  ownerPhones: string;
}

export interface PropertyListGroup {
  heading: string;
  rows: PropertyListRow[];
}

const RED = "#C81E2C";
const INK = "#1A1A1A";
const MUTED = "#555555";
const LINE = "#BBBBBB";

// Landscape A4 is 842pt wide; 30pt margins leave 782pt for the table.
const COL = { no: 26, ref: 84, name: 236, area: 150, demand: 82, size: 62, owner: 142 };

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: INK, paddingTop: 112, paddingBottom: 44, paddingHorizontal: 30, lineHeight: 1.3 },
  header: { position: "absolute", top: 20, left: 30, right: 30, height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: RED, paddingBottom: 6 },
  logo: { width: 64, height: 64 / LOGO_ASPECT },
  titleBox: { flex: 1, marginLeft: 14 },
  kind: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: RED, letterSpacing: 1 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 15, marginTop: 1 },
  sub: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  company: { textAlign: "right" },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  companyLine: { fontSize: 8, color: MUTED },
  colHead: { position: "absolute", top: 88, left: 30, right: 30, height: 20, flexDirection: "row", alignItems: "center", backgroundColor: "#EEEEEE", borderTopWidth: 1, borderBottomWidth: 1, borderColor: INK },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingHorizontal: 4, textTransform: "uppercase" },
  groupRow: { marginTop: 8, marginBottom: 2, paddingVertical: 3, paddingHorizontal: 4, backgroundColor: "#F6F6F6", borderBottomWidth: 1, borderBottomColor: INK },
  groupText: { fontFamily: "Helvetica-Bold", fontSize: 9.5, letterSpacing: 0.6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 4 },
  td: { paddingHorizontal: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED },
  footer: { position: "absolute", bottom: 18, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5 },
  footerText: { fontSize: 8, color: MUTED },
});

export function PropertyListDocument({
  groups,
  subtitle,
  printedOn,
  printedBy,
}: {
  groups: PropertyListGroup[];
  subtitle: string;
  printedOn: string;
  printedBy: string;
}) {
  let n = 0;
  return (
    <Document title="Properties - short list" author="5STAR.M Estate & Builders">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={LOGO_DATA_URI} style={styles.logo} />
          <View style={styles.titleBox}>
            <Text style={styles.kind}>OFFICE RECORD</Text>
            <Text style={styles.title}>Properties - short list</Text>
            <Text style={styles.sub}>
              {subtitle}  |  Printed on {printedOn} by {printedBy}
            </Text>
          </View>
          <View style={styles.company}>
            <Text style={styles.companyName}>5STAR.M Estate &amp; Builders</Text>
            <Text style={styles.companyLine}>1037-E-1 Johar Town, Lahore, Pakistan</Text>
            <Text style={styles.companyLine}>0308-6010310  |  5starmestate.com</Text>
          </View>
        </View>

        <View style={styles.colHead} fixed>
          <Text style={[styles.th, { width: COL.no }]}>#</Text>
          <Text style={[styles.th, { width: COL.ref }]}>Ref</Text>
          <Text style={[styles.th, { width: COL.name }]}>Property name</Text>
          <Text style={[styles.th, { width: COL.area }]}>Area</Text>
          <Text style={[styles.th, { width: COL.demand }]}>Demand</Text>
          <Text style={[styles.th, { width: COL.size }]}>Size</Text>
          <Text style={[styles.th, { width: COL.owner }]}>Owner contact</Text>
        </View>

        {groups.map((g) => (
          <View key={g.heading}>
            <View style={styles.groupRow} wrap={false} minPresenceAhead={50}>
              <Text style={styles.groupText}>
                {g.heading} ({g.rows.length})
              </Text>
            </View>
            {g.rows.map((r) => {
              n += 1;
              return (
                <View key={`${g.heading}-${r.serialNo}-${n}`} style={styles.row} wrap={false}>
                  <Text style={[styles.td, styles.muted, { width: COL.no }]}>{n}</Text>
                  <Text style={[styles.td, { width: COL.ref, fontSize: 8.5 }]}>{r.serialNo || "-"}</Text>
                  <Text style={[styles.td, styles.bold, { width: COL.name }]}>{r.title}</Text>
                  <Text style={[styles.td, { width: COL.area }]}>{r.area}</Text>
                  <Text style={[styles.td, styles.bold, { width: COL.demand }]}>{r.demand}</Text>
                  <Text style={[styles.td, { width: COL.size }]}>{r.size}</Text>
                  <View style={[styles.td, { width: COL.owner }]}>
                    {r.ownerPhones ? (
                      <>
                        {r.ownerName ? <Text style={styles.muted}>{r.ownerName}</Text> : null}
                        <Text style={styles.bold}>{r.ownerPhones}</Text>
                      </>
                    ) : (
                      <Text style={styles.muted}>Not saved</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Confidential - for office record only. Contains owners&apos; private contact numbers. Do not share outside the company.</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
