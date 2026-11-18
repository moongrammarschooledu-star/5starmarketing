import { site } from "@/lib/site";
import { buildAgreementContent } from "./content";
import { ltrHtml } from "./bidi";
import type { RentAgreementData } from "./types";

// The rent agreement as a page for the browser to print or "Save as PDF".
// The browser draws Urdu in real Nastaleeq (Jameel Noori Nastaleeq if it is installed on the
// computer, otherwise the bundled Noto Nastaliq Urdu) - something the server-side PDF engine
// cannot do. A4, company letterhead (plain paper) or an empty space for the stamp (stamp paper).

export function escHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const PRINT_STYLE = `
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Bold.ttf") format("truetype"); font-weight: 700; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #d9d9d9; color: #1a1a1a; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.bar { position: sticky; top: 0; z-index: 10; background: #17110f; color: #fff; padding: 10px 16px; font: 600 14px/1.4 system-ui, sans-serif; display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
.bar button, .bar a { background: #c81e2c; color: #fff; border: 0; border-radius: 999px; padding: 9px 20px; font: 700 14px system-ui, sans-serif; cursor: pointer; text-decoration: none; }
.bar a { background: #444; }
.bar small { font-weight: 400; color: #ddd; flex: 1 1 320px; }
.page { width: 210mm; margin: 14px auto; background: #fff; padding: 12mm 16mm 12mm; box-shadow: 0 2px 12px rgba(0,0,0,.25); }
.lang-en .page { font: 11.5pt/1.5 "Times New Roman", Times, serif; text-align: justify; }
.lang-ur .page { font: 13pt/2.45 "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; text-align: justify; }
.hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #c81e2c; padding-bottom: 8px; margin-bottom: 14px; direction: ltr; text-align: left; font-family: Arial, Helvetica, sans-serif; line-height: 1.35; }
.hdr img { height: 64px; width: auto; }
.hdr .co { text-align: right; }
.hdr .co b { font-size: 14pt; display: block; }
.hdr .co span { font-size: 8.5pt; color: #555; display: block; }
.stampspace { height: 66mm; }
.title { border: 1.4px solid #1a1a1a; text-align: center; padding: 4px 10px; margin: 0 0 8px; }
.lang-en .title { font: 700 16pt/1.5 Arial, Helvetica, sans-serif; letter-spacing: 1px; }
.lang-ur .title { font-weight: 700; font-size: 17pt; line-height: 2.2; }
.ltr { unicode-bidi: isolate; direction: ltr; }
.nw { white-space: nowrap; }
.ref { font: 9pt Arial, Helvetica, sans-serif; color: #555; margin: 0 0 6px; direction: ltr; text-align: right; }
p.para { margin: 0 0 6px; }
.clause { display: flex; gap: 8px; margin: 0 0 6px; break-inside: avoid; }
.clause .no { flex: 0 0 24px; font-weight: 700; }
.clause .txt { flex: 1; }
.closing { margin: 10px 0 0; break-inside: avoid; }
.signs { margin-top: 16px; break-inside: avoid; font-family: Arial, Helvetica, sans-serif; }
.lang-ur .signs { font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 14px; }
.thumb { width: 64px; height: 64px; border: 1px solid #777; margin-bottom: 4px; }
.cap { font-size: 8.5pt; color: #555; }
.sigline { border-bottom: 1px solid #1a1a1a; height: 34px; margin-bottom: 2px; }
.lbl { font-weight: 700; font-size: 10.5pt; }
.nm { font-size: 10pt; line-height: 1.7; }
.cn { font: 9pt Arial, Helvetica, sans-serif; color: #444; direction: ltr; }
.lang-ur .cn { text-align: right; }
.note { font: 8pt Arial, Helvetica, sans-serif; color: #666; margin-top: 8px; text-align: left; direction: ltr; }
.lang-ur .note { font: 8.5pt "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; text-align: right; direction: rtl; }
.ftr { margin-top: 18px; border-top: 1px solid #bbb; padding-top: 4px; font: 7.5pt Arial, Helvetica, sans-serif; color: #666; direction: ltr; text-align: left; }
@page { size: A4; margin: 30mm 16mm 18mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, Helvetica, sans-serif; color: #666; } }
.paper-stamp { }
@media print {
  html, body { background: #fff; }
  .bar { display: none; }
  .page { width: auto; margin: 0; padding: 0; box-shadow: none; }
  .hdr { position: fixed; top: -26mm; left: 0; right: 0; margin: 0; }
  .ftr { position: fixed; bottom: -14mm; left: 0; right: 0; margin: 0; }
  .paper-stamp .hdr { display: none; }
}
`;

/** The company letterhead (logo, name, address, phone, website) at the top of a printed page. */
export function letterheadHtml(): string {
  return `<div class="hdr"><img src="/images/logo.png" alt="${escHtml(site.name)}"><div class="co"><b>${escHtml(site.fullName)}</b><span>${escHtml(site.address)}</span><span>${escHtml(site.phoneDisplay2)} &nbsp;|&nbsp; ${escHtml(site.websiteUrl.replace(/^https?:\/\//, ""))}</span></div></div>`;
}

export function renderAgreementHtml(data: RentAgreementData, agreementNo?: string): string {
  const c = buildAgreementContent(data);
  const lang: "ur" | "en" = data.language === "en" ? "en" : "ur";
  const stamp = data.paper === "stamp";
  const dir = lang === "ur" ? "rtl" : "ltr";
  const pick = (en: string, ur: string) => (lang === "ur" ? ur.trim() || en.trim() : en.trim());
  // Keeps numbers and English words in their own left-to-right order inside Urdu lines (107-A, CNICs, amounts).
  const t = (text: string) => (lang === "ur" ? ltrHtml(text, escHtml) : escHtml(text));

  const clauses = c.clauses.map((p, i) => `<div class="clause"><span class="no">${i + 1}.</span><div class="txt">${t(p[lang])}</div></div>`).join("");
  const extras = c.extra.map((x, i) => `<div class="clause"><span class="no">${c.clauses.length + i + 1}.</span><div class="txt" dir="auto">${escHtml(x)}</div></div>`).join("");
  const intro = c.intro.map((p) => `<p class="para">${t(p[lang])}</p>`).join("");

  const sig = (en: string, ur: string, name: string, nameUr: string, cnic: string) =>
    `<div><div class="lbl">${lang === "ur" ? ur : en}</div><div class="sigline"></div>${pick(name, nameUr) ? `<div class="nm">${t(pick(name, nameUr))}</div>` : ""}${cnic.trim() ? `<div class="cn">CNIC: ${escHtml(cnic.trim())}</div>` : ""}</div>`;
  const thumb = `<div><div class="thumb"></div><div class="cap">${lang === "ur" ? "انگوٹھا" : "Thumb impression"}</div></div>`;
  const w = data.witnesses;
  const note =
    lang === "ur"
      ? `یہ اقرار نامہ فریقین کی فراہم کردہ معلومات پر ${site.fullName} نے تیار کیا ہے۔ دستخط سے پہلے پورا اقرار نامہ پڑھ لیں۔`
      : `Prepared by ${site.fullName} on the information given by the parties. Please read the whole agreement before signing.`;

  const letterhead = letterheadHtml();

  return `<!doctype html>
<html lang="${lang === "ur" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rent Agreement${agreementNo ? ` ${escHtml(agreementNo)}` : ""}</title>
<style>${PRINT_STYLE}${stamp ? "@page { margin: 14mm 16mm 18mm; }" : ""}</style>
</head>
<body class="lang-${lang} paper-${data.paper}">
<div class="bar" dir="ltr">
  <button type="button" id="print-btn">Print / Save as PDF</button>
  <a href="javascript:history.back()">Back</a>
  <small>In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), turn OFF &ldquo;Headers and footers&rdquo;, turn ON &ldquo;Background graphics&rdquo;, paper A4. ${stamp ? "The top of the first page is left empty for the stamp." : "The company letterhead is printed at the top of every page."}</small>
</div>
<div class="page" dir="${dir}">
  ${stamp ? "" : letterhead}
  ${stamp ? '<div class="stampspace"></div>' : ""}
  <div class="title">${escHtml(c.title[lang])}</div>
  ${agreementNo ? `<div class="ref">Agreement No. ${escHtml(agreementNo)}</div>` : ""}
  ${intro}
  ${clauses}
  ${extras}
  <p class="closing">${t(c.closing[lang])}</p>
  <div class="signs">
    <div class="row2">${thumb}${thumb}</div>
    <div class="row2">${sig("Owner", "مالک مذکور", data.owner.name, data.owner.nameUr, data.owner.cnic)}${sig("Tenant", "کرایہ دار", data.tenant.name, data.tenant.nameUr, data.tenant.cnic)}</div>
    <div class="row2">${sig("Witness 1", "گواہ شد (1)", w[0]?.name ?? "", w[0]?.nameUr ?? "", w[0]?.cnic ?? "")}${sig("Witness 2", "گواہ شد (2)", w[1]?.name ?? "", w[1]?.nameUr ?? "", w[1]?.cnic ?? "")}</div>
    <div class="note">${escHtml(note)}</div>
  </div>
  <div class="ftr">${escHtml(site.fullName)} &nbsp;|&nbsp; ${escHtml(site.addressShort)} &nbsp;|&nbsp; ${escHtml(site.phoneDisplay2)}${agreementNo ? ` &nbsp;|&nbsp; ${escHtml(agreementNo)}` : ""}</div>
</div>
<script>document.getElementById("print-btn").addEventListener("click", function () { window.print(); });</script>
</body>
</html>`;
}
