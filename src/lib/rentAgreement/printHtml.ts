import { site } from "@/lib/site";
import { buildAgreementContent } from "./content";
import { ltrHtml } from "./bidi";
import type { RentAgreementData } from "./types";

// The rent agreement as a page for the browser to print or "Save as PDF".
// The browser draws Urdu in real Nastaleeq (Jameel Noori Nastaleeq if it is installed on the
// computer, otherwise the bundled Noto Nastaliq Urdu) - something the server-side PDF engine
// cannot do. A4, company letterhead (plain paper) or an empty space for the stamp (stamp paper).
//
// LAYOUT: the whole document is one table. Its header part (the letterhead) and its footer part
// (the company line) are repeated by the browser on every printed page, in their proper place,
// and the page margin is 0, so the browser prints no date / address line of its own and nothing
// can be cut off. (Fixed-position headers in the page margin are NOT printed reliably.)

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
.page { width: 210mm; margin: 14px auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.25); }

/* the document: one table, header and footer repeated on every printed page */
table.doc { width: 100%; height: 296mm; border-collapse: collapse; border-spacing: 0; table-layout: fixed; }
table.doc > thead { display: table-header-group; }
table.doc > tfoot { display: table-footer-group; }
table.doc > thead > tr > td { padding: 9mm 16mm 0; }
table.doc > tbody > tr > td { padding: 0 16mm; vertical-align: top; }
table.doc > tfoot > tr > td { padding: 0; }
.ftrspace { height: 20mm; }
table.doc tr.keep { break-inside: avoid; page-break-inside: avoid; }
table.doc tr { orphans: 3; widows: 3; }
table.doc tr.fill { height: 100%; }
table.doc tr.fill > td { padding: 0; }
.lang-en .doc { font: 11pt/1.45 "Times New Roman", Times, serif; text-align: justify; }
.lang-ur .doc { font: 12.5pt/2.3 "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; text-align: justify; }

.hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #c81e2c; padding-bottom: 8px; margin-bottom: 10px; direction: ltr; text-align: left; font-family: Arial, Helvetica, sans-serif; line-height: 1.35; }
.hdr img { height: 64px; width: auto; }
.hdr .co { text-align: right; }
.hdr .co b { font-size: 14pt; display: block; }
.hdr .co span { font-size: 8.5pt; color: #555; display: block; }
.stamptop { height: 8mm; }
.stampspace { height: 62mm; }
.title { border: 1.4px solid #1a1a1a; text-align: center; padding: 4px 10px; margin: 0 0 8px; }
.lang-en .title { font: 700 16pt/1.5 Arial, Helvetica, sans-serif; letter-spacing: 1px; }
.lang-ur .title { font-weight: 700; font-size: 17pt; line-height: 2.2; }
.ltr { unicode-bidi: isolate; direction: ltr; }
.nw { white-space: nowrap; }
.ref { font: 9pt Arial, Helvetica, sans-serif; color: #555; margin: 0 0 4px; direction: ltr; text-align: right; }
p.para { margin: 0 0 4px; }
.clause { display: flex; gap: 8px; margin: 0 0 4px; }
.clause .no { flex: 0 0 24px; font-weight: 700; }
.clause .txt { flex: 1; min-width: 0; }
.closing { margin: 8px 0 0; }
.signs { margin-top: 10px; font-family: Arial, Helvetica, sans-serif; }
.lang-ur .signs { font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 8px; }
.thumb { width: 56px; height: 56px; border: 1px solid #777; margin-bottom: 4px; }
.cap { font-size: 8.5pt; color: #555; }
.sigline { border-bottom: 1px solid #1a1a1a; height: 24px; margin-bottom: 2px; }
.lbl { font-weight: 700; font-size: 10.5pt; }
.nm { font-size: 10pt; line-height: 1.7; }
.cn { font: 9pt Arial, Helvetica, sans-serif; color: #444; direction: ltr; }
.lang-ur .cn { text-align: right; }
.note { font: 8pt Arial, Helvetica, sans-serif; color: #666; margin-top: 6px; text-align: left; direction: ltr; }
.lang-ur .note { font: 8.5pt "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; text-align: right; direction: rtl; }
.ftr-box { padding: 0 16mm 8mm; direction: ltr; }
.ftr { border-top: 1.5px solid #c81e2c; padding-top: 4px; font: 7.5pt Arial, Helvetica, sans-serif; color: #555; direction: ltr; text-align: center; }

/* margin 0: the browser then prints no header / footer line of its own */
@page { size: A4; margin: 0; }
@media print {
  html, body { background: #fff; }
  .bar { display: none; }
  .page { width: auto; margin: 0; box-shadow: none; }
  /* the company line sits at the very bottom of every printed page (the table keeps its space free) */
  .ftr-box { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; }
}
`;

/** The company letterhead (logo, name, address, phone, website) at the top of a printed page. */
export function letterheadHtml(): string {
  return `<div class="hdr"><img src="/images/logo.png" alt="${escHtml(site.name)}"><div class="co"><b>${escHtml(site.fullName)}</b><span>${escHtml(site.address)}</span><span>${escHtml(site.phoneDisplay2)} &nbsp;|&nbsp; ${escHtml(site.websiteUrl.replace(/^https?:\/\//, ""))}</span></div></div>`;
}

/** The company line at the bottom of every printed page. */
export function footerHtml(extra?: string): string {
  return `<div class="ftr">${escHtml(site.fullName)} &nbsp;|&nbsp; ${escHtml(site.addressShort)} &nbsp;|&nbsp; ${escHtml(site.phoneDisplay2)}${extra ? ` &nbsp;|&nbsp; ${escHtml(extra)}` : ""}</div>`;
}

/** The page as one table: `head` and `footer` repeat on every printed page, each string in `rows` is one block of the body. */
export function docTableHtml(opts: { head: string; rows: (string | { html: string; keep: boolean })[]; footer: string }): string {
  const row = (r: string | { html: string; keep: boolean }) => (typeof r === "string" ? `<tr><td>${r}</td></tr>` : `<tr${r.keep ? " class=\"keep\"" : ""}><td>${r.html}</td></tr>`);
  return `<table class="doc"><thead><tr><td>${opts.head}</td></tr></thead><tbody>${opts.rows.map(row).join("")}<tr class="fill"><td></td></tr></tbody><tfoot><tr><td><div class="ftrspace"></div></td></tr></tfoot></table><div class="ftr-box">${opts.footer}</div>`;
}

export function renderAgreementHtml(data: RentAgreementData, agreementNo?: string): string {
  const c = buildAgreementContent(data);
  const lang: "ur" | "en" = data.language === "en" ? "en" : "ur";
  const stamp = data.paper === "stamp";
  const dir = lang === "ur" ? "rtl" : "ltr";
  const pick = (en: string, ur: string) => (lang === "ur" ? ur.trim() || en.trim() : en.trim());
  // Keeps numbers and English words in their own left-to-right order inside Urdu lines (107-A, CNICs, amounts).
  const t = (text: string) => (lang === "ur" ? ltrHtml(text, escHtml) : escHtml(text));

  const sig = (en: string, ur: string, name: string, nameUr: string, cnic: string) =>
    `<div><div class="lbl">${lang === "ur" ? ur : en}</div><div class="sigline"></div>${pick(name, nameUr) ? `<div class="nm">${t(pick(name, nameUr))}</div>` : ""}${cnic.trim() ? `<div class="cn">CNIC: ${escHtml(cnic.trim())}</div>` : ""}</div>`;
  const thumb = `<div><div class="thumb"></div><div class="cap">${lang === "ur" ? "انگوٹھا" : "Thumb impression"}</div></div>`;
  const w = data.witnesses;
  const note =
    lang === "ur"
      ? `یہ اقرار نامہ فریقین کی فراہم کردہ معلومات پر ${site.fullName} نے تیار کیا ہے۔ دستخط سے پہلے پورا اقرار نامہ پڑھ لیں۔`
      : `Prepared by ${site.fullName} on the information given by the parties. Please read the whole agreement before signing.`;

  const rows: (string | { html: string; keep: boolean })[] = [];
  if (stamp) rows.push('<div class="stampspace"></div>');
  rows.push({ keep: true, html: `<div class="title">${escHtml(c.title[lang])}</div>${agreementNo ? `<div class="ref">Agreement No. ${escHtml(agreementNo)}</div>` : ""}` });
  for (const p of c.intro) rows.push(`<p class="para">${t(p[lang])}</p>`);
  c.clauses.forEach((p, i) => rows.push(`<div class="clause"><span class="no">${i + 1}.</span><div class="txt">${t(p[lang])}</div></div>`));
  c.extra.forEach((x, i) => rows.push(`<div class="clause"><span class="no">${c.clauses.length + i + 1}.</span><div class="txt" dir="auto">${escHtml(x)}</div></div>`));
  rows.push({
    keep: true,
    html: `<p class="closing">${t(c.closing[lang])}</p>
  <div class="signs">
    <div class="row2">${thumb}${thumb}</div>
    <div class="row2">${sig("Owner", "مالک مذکور", data.owner.name, data.owner.nameUr, data.owner.cnic)}${sig("Tenant", "کرایہ دار", data.tenant.name, data.tenant.nameUr, data.tenant.cnic)}</div>
    <div class="row2">${sig("Witness 1", "گواہ شد (1)", w[0]?.name ?? "", w[0]?.nameUr ?? "", w[0]?.cnic ?? "")}${sig("Witness 2", "گواہ شد (2)", w[1]?.name ?? "", w[1]?.nameUr ?? "", w[1]?.cnic ?? "")}</div>
    <div class="note">${escHtml(note)}</div>
  </div>`,
  });

  return `<!doctype html>
<html lang="${lang === "ur" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rent Agreement${agreementNo ? ` ${escHtml(agreementNo)}` : ""}</title>
<style>${PRINT_STYLE}</style>
</head>
<body class="lang-${lang} paper-${data.paper}">
<div class="bar" dir="ltr">
  <button type="button" id="print-btn">Print / Save as PDF</button>
  <a href="javascript:history.back()">Back</a>
  <small>In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), paper A4, turn ON &ldquo;Background graphics&rdquo;. ${stamp ? "The top of the first page is left empty for the stamp." : "The company letterhead is printed at the top of every page."}</small>
</div>
<div class="page" dir="${dir}">
${docTableHtml({ head: stamp ? '<div class="stamptop"></div>' : letterheadHtml(), rows, footer: footerHtml(agreementNo) })}
</div>
<script>document.getElementById("print-btn").addEventListener("click", function () { window.print(); });</script>
</body>
</html>`;
}
