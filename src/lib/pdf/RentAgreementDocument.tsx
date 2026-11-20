/* eslint-disable jsx-a11y/alt-text -- this is react-pdf's own <Image>, which has no alt attribute */
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_ASPECT, LOGO_DATA_URI } from "./logoData";
import { site } from "@/lib/site";
import { buildAgreementContent } from "@/lib/rentAgreement/content";
import { ltrRuns } from "@/lib/rentAgreement/bidi";
import type { RentAgreementData } from "@/lib/rentAgreement/types";

// The English rent agreement as a PDF file (for downloading, keeping in Documents, sending on
// WhatsApp). Urdu agreements are printed from the print page instead (Admin -> Rent Agreements
// -> Print), because the browser draws Nastaleeq Urdu properly and this PDF engine cannot.
// (Urdu is still supported here with the Naskh font, as a plain fallback.)

const FONT_DIR = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
Font.register({
  family: "Naskh",
  fonts: [{ src: path.join(FONT_DIR, "NotoNaskhArabic-Regular.ttf") }, { src: path.join(FONT_DIR, "NotoNaskhArabic-Bold.ttf"), fontWeight: "bold" }],
});

const RED = "#C81E2C";
const INK = "#1A1A1A";
const MUTED = "#555555";
const LINE = "#BBBBBB";
/** Height left empty at the top of the first page on stamp paper (the printed stamp). */
const STAMP_SPACE = 215;
const NUM_W = 20;

const s = StyleSheet.create({
  pagePlain: { fontFamily: "Helvetica", fontSize: 10.5, color: INK, paddingTop: 96, paddingBottom: 62, paddingHorizontal: 44 },
  pageStamp: { fontFamily: "Helvetica", fontSize: 10.5, color: INK, paddingTop: 36, paddingBottom: 62, paddingHorizontal: 44 },
  header: { position: "absolute", top: 24, left: 44, right: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: RED, paddingBottom: 8 },
  logo: { width: 74, height: 74 / LOGO_ASPECT },
  company: { textAlign: "right" },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  companyLine: { fontSize: 8.5, color: MUTED },
  footer: { position: "absolute", bottom: 20, left: 44, right: 44, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: MUTED },
  titleBox: { borderWidth: 1.2, borderColor: INK, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 12, alignItems: "center" },
  titleEn: { fontFamily: "Helvetica-Bold", fontSize: 15, letterSpacing: 1 },
  refLine: { fontSize: 8.5, color: MUTED, textAlign: "right", marginBottom: 8 },
  numRow: { flexDirection: "row", marginBottom: 8 },
  num: { width: NUM_W, minWidth: NUM_W, flexShrink: 0, fontFamily: "Helvetica-Bold" },
  grow: { flex: 1 },
  sign: { marginTop: 18 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  signBox: { width: "48.5%" },
  thumb: { width: 62, height: 62, borderWidth: 0.8, borderColor: MUTED, marginBottom: 6 },
  sigLine: { borderBottomWidth: 0.8, borderBottomColor: INK, height: 26, marginBottom: 3 },
  note: { marginTop: 4, fontSize: 7.5, color: MUTED },
});

type Lang = "ur" | "en";

function Para({ lang, size, children }: { lang: Lang; size: number; children: string }) {
  return lang === "ur" ? (
    <Text style={{ fontFamily: "Naskh", fontSize: size + 1, lineHeight: 1.85, textAlign: "right" }}>{ltrRuns(children)}</Text>
  ) : (
    <Text style={{ fontSize: size, lineHeight: 1.4, textAlign: "justify" }}>{children}</Text>
  );
}

/** One numbered (or unnumbered) paragraph, the number beside it. */
function Item({ lang, n, size, children }: { lang: Lang; n?: number; size: number; children: string }) {
  if (lang === "ur") {
    return (
      <View style={s.numRow}>
        <View style={s.grow}>
          <Para lang="ur" size={size}>{children}</Para>
        </View>
        {n !== undefined && <Text style={{ width: NUM_W, minWidth: NUM_W, flexShrink: 0, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: size }}>{`${n}.`}</Text>}
      </View>
    );
  }
  return (
    <View style={s.numRow}>
      {n !== undefined && <Text style={[s.num, { fontSize: size }]}>{`${n}.`}</Text>}
      <View style={s.grow}>
        <Para lang="en" size={size}>{children}</Para>
      </View>
    </View>
  );
}

function Signature({ en, ur, lang, name, nameUr, cnic }: { en: string; ur: string; lang: Lang; name?: string; nameUr?: string; cnic?: string }) {
  const shown = lang === "ur" ? nameUr || name : name;
  return (
    <View style={s.signBox}>
      {lang === "en" ? (
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>{en}</Text>
      ) : (
        <Text style={{ fontFamily: "Naskh", fontWeight: "bold", fontSize: 11, textAlign: "right" }}>{ur}</Text>
      )}
      <View style={s.sigLine} />
      {shown ? lang === "ur" ? <Text style={{ fontFamily: "Naskh", fontSize: 10, textAlign: "right" }}>{ltrRuns(shown)}</Text> : <Text style={{ fontSize: 9 }}>{shown}</Text> : null}
      {cnic ? <Text style={{ fontSize: 8.5, color: MUTED, textAlign: lang === "ur" ? "right" : "left" }}>CNIC: {cnic}</Text> : null}
    </View>
  );
}

export function RentAgreementDocument({ data, agreementNo, printedOn }: { data: RentAgreementData; agreementNo?: string; printedOn: string }) {
  const c = buildAgreementContent(data);
  const lang: Lang = data.language === "en" ? "en" : "ur";
  const stamp = data.paper === "stamp";
  const size = lang === "ur" ? 11 : 10.5;
  const extra = c.extra;
  const base = c.clauses.length;
  // Text typed with Urdu letters needs the Urdu font even in an English agreement.
  const ARABIC = /[؀-ۿ]/;

  return (
    <Document title={`Rent Agreement${agreementNo ? ` ${agreementNo}` : ""}`} author={site.fullName}>
      <Page size={stamp ? "LEGAL" : "A4"} style={stamp ? s.pageStamp : s.pagePlain}>
        {!stamp && (
          <View style={s.header} fixed>
            <Image src={LOGO_DATA_URI} style={s.logo} />
            <View style={s.company}>
              <Text style={s.companyName}>{site.fullName}</Text>
              <Text style={s.companyLine}>{site.address}</Text>
              <Text style={s.companyLine}>
                {site.phoneDisplay2}  |  {site.websiteUrl.replace(/^https?:\/\//, "")}
              </Text>
            </View>
          </View>
        )}

        {stamp && <View style={{ height: STAMP_SPACE }} />}

        <View style={s.titleBox}>
          {lang === "en" ? <Text style={s.titleEn}>{c.title.en}</Text> : <Text style={{ fontFamily: "Naskh", fontWeight: "bold", fontSize: 18 }}>{c.title.ur}</Text>}
        </View>
        {agreementNo ? <Text style={s.refLine}>Agreement No. {agreementNo}</Text> : null}

        {c.intro.map((p, i) => (
          <Item key={`i${i}`} lang={lang} size={size}>{p[lang]}</Item>
        ))}

        {c.clauses.map((p, i) => (
          <View key={`c${i}`} wrap={false}>
            <Item lang={lang} n={i + 1} size={size}>{p[lang]}</Item>
          </View>
        ))}

        {extra.map((t, i) => (
          <View key={`x${i}`} wrap={false}>
            <Item lang={ARABIC.test(t) ? "ur" : lang} n={base + i + 1} size={size}>{t}</Item>
          </View>
        ))}

        <View style={{ marginTop: 4 }} wrap={false}>
          <Para lang={lang} size={size}>{c.closing[lang]}</Para>
        </View>

        <View style={s.sign} wrap={false}>
          <View style={s.signRow}>
            {[0, 1].map((i) => (
              <View key={i} style={[s.signBox, { alignItems: lang === "ur" ? "flex-end" : "flex-start" }]}>
                <View style={s.thumb} />
                <Text style={{ fontFamily: lang === "ur" ? "Naskh" : "Helvetica", fontSize: 8, color: MUTED }}>{lang === "ur" ? "انگوٹھا" : "Thumb impression"}</Text>
              </View>
            ))}
          </View>
          <View style={s.signRow}>
            <Signature en="Owner" ur="مالک مذکور" lang={lang} name={data.owner.name} nameUr={data.owner.nameUr} cnic={data.owner.cnic} />
            <Signature en="Tenant" ur="کرایہ دار" lang={lang} name={data.tenant.name} nameUr={data.tenant.nameUr} cnic={data.tenant.cnic} />
          </View>
          <View style={s.signRow}>
            <Signature en="Witness 1" ur="گواہ شد (1)" lang={lang} name={data.witnesses[0]?.name} nameUr={data.witnesses[0]?.nameUr} cnic={data.witnesses[0]?.cnic} />
            <Signature en="Witness 2" ur="گواہ شد (2)" lang={lang} name={data.witnesses[1]?.name} nameUr={data.witnesses[1]?.nameUr} cnic={data.witnesses[1]?.cnic} />
          </View>
          <Text style={s.note}>Prepared by {site.fullName} on the information given by the parties. Please read the whole agreement before signing.</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {site.fullName}  |  {site.addressShort}  |  {site.phoneDisplay2}
            {agreementNo ? `  |  ${agreementNo}` : ""}
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}  |  ${printedOn}`} />
        </View>
      </Page>
    </Document>
  );
}
