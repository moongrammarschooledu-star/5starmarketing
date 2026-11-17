/* eslint-disable jsx-a11y/alt-text -- this is react-pdf's own <Image>, which has no alt attribute */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_ASPECT, LOGO_DATA_URI } from "./logoData";

// A printable list for the office file: a table with a heading row that repeats
// on every page, rows grouped under headings, landscape A4, black on white.
// Each cell is a few short lines of text; the first line can be bold.

export interface TableColumn {
  label: string;
  /** Width in points; all columns together should add up to 782 (landscape A4 less margins). */
  width: number;
  /** Print the first line of the cell in bold. */
  boldFirst?: boolean;
}

export interface TableListRow {
  /** One entry per column; each is the lines of that cell. */
  cells: string[][];
}

export interface TableListGroup {
  heading: string;
  rows: TableListRow[];
}

const RED = "#C81E2C";
const INK = "#1A1A1A";
const MUTED = "#555555";
const LINE = "#BBBBBB";
const NUMBER_WIDTH = 24;

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

export function TableListDocument({
  title,
  kind,
  subtitle,
  columns,
  groups,
  printedOn,
  printedBy,
  footerNote,
}: {
  title: string;
  kind: string;
  subtitle: string;
  columns: TableColumn[];
  groups: TableListGroup[];
  printedOn: string;
  printedBy: string;
  footerNote: string;
}) {
  let n = 0;
  return (
    <Document title={title} author="5STAR.M Estate & Builders">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={LOGO_DATA_URI} style={styles.logo} />
          <View style={styles.titleBox}>
            <Text style={styles.kind}>{kind}</Text>
            <Text style={styles.title}>{title}</Text>
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
          <Text style={[styles.th, { width: NUMBER_WIDTH }]}>#</Text>
          {columns.map((c) => (
            <Text key={c.label} style={[styles.th, { width: c.width }]}>
              {c.label}
            </Text>
          ))}
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
                <View key={`${g.heading}-${n}`} style={styles.row} wrap={false}>
                  <Text style={[styles.td, styles.muted, { width: NUMBER_WIDTH }]}>{n}</Text>
                  {columns.map((c, i) => {
                    const lines = r.cells[i] ?? [];
                    return (
                      <View key={c.label} style={[styles.td, { width: c.width }]}>
                        {lines.length === 0 ? (
                          <Text style={styles.muted}>-</Text>
                        ) : (
                          lines.map((line, j) => (
                            <Text key={j} style={c.boldFirst && j === 0 ? styles.bold : j > 0 && c.boldFirst ? styles.muted : undefined}>
                              {line}
                            </Text>
                          ))
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{footerNote}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
