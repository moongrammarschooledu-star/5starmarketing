import { site } from "@/lib/site";
import { buildAgreementContent } from "./content";
import { ltrHtml } from "./bidi";
import { urduGaps, type RentAgreementData } from "./types";

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

/** Page sizes in mm. Legal (8.5 x 14 in) is the usual size for agreements. */
export const PAGES = { a4: { w: 210, h: 297 }, legal: { w: 215.9, h: 355.6 } } as const;
export type PageMm = { w: number; h: number };

/** Urdu text: Jameel Noori Nastaleeq (the usual agreement font) when it is on the computer or its file is
 *  added as /fonts/JameelNooriNastaleeq.ttf, otherwise Gulzar, then Noto Nastaliq Urdu. */
const UR_FONT = '"Jameel Noori Nastaleeq", "Gulzar", "Noto Nastaliq Urdu", serif';

export function buildPrintStyle(page: PageMm): string {
  return `
@font-face { font-family: "Jameel Noori Nastaleeq"; src: local("Jameel Noori Nastaleeq"), local("JameelNooriNastaleeq"), url("/fonts/JameelNooriNastaleeq.ttf") format("truetype"); }
@font-face { font-family: "Gulzar"; src: url("/fonts/Gulzar-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Bold.ttf") format("truetype"); font-weight: 700; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #d9d9d9; color: #1a1a1a; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.bar { position: sticky; top: 0; z-index: 10; background: #17110f; color: #fff; padding: 10px 16px; font: 600 14px/1.4 system-ui, sans-serif; display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
.bar button, .bar a { background: #c81e2c; color: #fff; border: 0; border-radius: 999px; padding: 9px 20px; font: 700 14px system-ui, sans-serif; cursor: pointer; text-decoration: none; }
.bar a { background: #444; }
.bar small { font-weight: 400; color: #ddd; flex: 1 1 320px; }
.page { position: relative; width: ${page.w}mm; margin: 14px auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.25); }
/* the double-line border drawn round every page of an agreement on plain paper */
.frame { position: absolute; inset: 7mm; border: 2px solid #1a1a1a; pointer-events: none; z-index: 0; }
.frame::after { content: ""; position: absolute; inset: 1.6mm; border: 1px dotted #1a1a1a; }
table.doc { position: relative; z-index: 1; }

/* the document: one table, header and footer repeated on every printed page */
table.doc { width: 100%; height: ${page.h - 1}mm; border-collapse: collapse; border-spacing: 0; table-layout: fixed; }
table.doc > thead { display: table-header-group; }
table.doc > tfoot { display: table-footer-group; }
table.doc > thead > tr > td { padding: 11mm 17mm 0; }
.paper-stamp table.doc > thead > tr > td { padding-top: 8mm; }
table.doc > tbody > tr > td { padding: 0 17mm; vertical-align: top; }
table.doc > tfoot > tr > td { padding: 0; }
.ftrspace { height: 20mm; }
table.doc tr.keep { break-inside: avoid; page-break-inside: avoid; }
table.doc tr { orphans: 3; widows: 3; }
table.doc tr.fill { height: 100%; }
table.doc tr.fill > td { padding: 0; }
.lang-en .doc { font: calc(11.5pt * var(--s, 1))/1.5 "Times New Roman", Times, serif; text-align: justify; }
.lang-ur .doc { font: calc(14pt * var(--s, 1))/2.3 ${UR_FONT}; text-align: justify; }

.hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #c81e2c; padding-bottom: 6px; margin-bottom: 6px; direction: ltr; text-align: left; font-family: Arial, Helvetica, sans-serif; line-height: 1.35; }
.hdr img { height: 23mm; width: auto; }
.hdr .co { text-align: right; }
.hdr .co b { font-size: 17pt; display: block; letter-spacing: .2px; }
.hdr .co > span { font-size: 9.5pt; color: #444; display: block; }
.hdr.ur { direction: rtl; font-family: ${UR_FONT}; line-height: 1.9; }
.hdr.ur .co { text-align: left; }
.hdr.ur .co b { font-size: 19pt; }
.stamptop { height: 8mm; }
.stampspace { height: 62mm; }
.title { border: 1.4px solid #1a1a1a; text-align: center; padding: 4px 10px; margin: 0 0 8px; }
.lang-en .title { font: 700 16pt/1.5 Arial, Helvetica, sans-serif; letter-spacing: 1px; }
.lang-ur .title { font-weight: 700; font-size: 20pt; line-height: 2; border: 3px double #1a1a1a; padding: 0 10px; }
.lang-ur .title small { font-size: 13pt; font-weight: 700; margin-inline-start: 6px; }
.ltr { unicode-bidi: isolate; direction: ltr; }
.nw { white-space: nowrap; }
.ref { font: 9pt Arial, Helvetica, sans-serif; color: #555; margin: 0 0 4px; direction: ltr; text-align: right; }
p.para { margin: 0 0 3px; }
p.flow { margin: 0; text-align: justify; }
p.flow b.n { font-weight: 700; }
.lang-ur b { font-weight: 700; }
.clause { display: flex; gap: 8px; margin: 0 0 3px; }
.clause .no { flex: 0 0 24px; font-weight: 700; }
.clause .txt { flex: 1; min-width: 0; }
.closing { margin: 8px 0 0; }
.signs { margin-top: 10px; font-family: Arial, Helvetica, sans-serif; }
.lang-ur .signs { font-family: ${UR_FONT}; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 4px; }
.thumb { width: 56px; height: 56px; border: 1px solid #777; margin-bottom: 4px; }
.cap { font-size: 8.5pt; color: #555; }
.sigline { border-bottom: 1px solid #1a1a1a; height: 24px; margin-bottom: 4px; }
.lbl { font-weight: 700; font-size: 10.5pt; }
.lang-ur .lbl { font-size: 13pt; }
.signs .sigline { height: 28px; }
.signs .wit .sigline { height: 10px; }
.signs .wit .lbl { font-size: 10pt; }
.signs .wit .nm { line-height: 1.8; padding-top: 0; }
.row2.wit { margin-top: 4px; }
.lang-ur .nm b { font-size: 12pt; }
.nm { font-size: 10pt; line-height: 1.7; padding-top: 2px; }
.lang-ur .nm { line-height: 2.5; padding-top: 4px; }
.cn { font: 9pt Arial, Helvetica, sans-serif; color: #444; direction: ltr; }
.lang-ur .cn { text-align: right; direction: rtl; font-family: ${UR_FONT}; font-size: 9.5pt; }
.note { font: 8pt Arial, Helvetica, sans-serif; color: #666; margin-top: 6px; text-align: left; direction: ltr; }
.lang-ur .note { font: 8.5pt ${UR_FONT}; text-align: right; direction: rtl; }
.ftr-box { padding: 0 17mm 11mm; direction: ltr; }
.ftr.ur { font: 9pt/1.9 ${UR_FONT}; direction: rtl; }
.ftr { border-top: 1.5px solid #c81e2c; padding-top: 4px; font: 7.5pt Arial, Helvetica, sans-serif; color: #555; direction: ltr; text-align: center; }

/* margin 0: the browser then prints no header / footer line of its own */
@page { size: ${page.w}mm ${page.h}mm; margin: 0; }
@media print {
  html, body { background: #fff; }
  .bar { display: none; }
  .page { width: auto; margin: 0; box-shadow: none; }
  /* the company line sits at the very bottom of every printed page (the table keeps its space free) */
  /* the border is drawn again on every printed page */
  .frame { position: fixed; }
  .ftr-box { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; }
}
`;
}

export const PRINT_STYLE = buildPrintStyle(PAGES.a4);

/** Makes the text a little smaller, only if needed, so the agreement fits in `maxPages` pages (never below `minScale`). */
export function fitScript(pageHeightMm: number, maxPages: number, minScale: number): string {
  return `<script>(function(){function mm(px){return px/3.7795}function run(){var doc=document.querySelector("table.doc");if(!doc||!doc.tHead)return;var head=doc.tHead,sp=doc.querySelector(".ftrspace"),body=doc.tBodies[0];function bodyH(){var h=0;for(var i=0;i<body.rows.length;i++){if(body.rows[i].className.indexOf("fill")<0)h+=body.rows[i].getBoundingClientRect().height}return mm(h)}var cap=${pageHeightMm}-mm(head.getBoundingClientRect().height)-mm(sp.getBoundingClientRect().height)-6;var s=1;doc.style.setProperty("--s",s);while(bodyH()>${maxPages}*cap*0.9&&s>${minScale}){s=Math.round((s-0.02)*100)/100;doc.style.setProperty("--s",s)}}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(run)}else{window.addEventListener("load",run)}})();</script>`;
}

/** The company letterhead (logo, name, address, phone, website) at the top of a printed page. */
export function letterheadHtml(lang: "en" | "ur" = "en"): string {
  const web = escHtml(site.websiteUrl.replace(/^https?:\/\//, ""));
  if (lang === "ur") {
    return `<div class="hdr ur"><img src="/images/logo.png" alt="${escHtml(site.name)}"><div class="co"><b>${escHtml(site.fullNameUr)}</b><span>${ltrHtml(site.addressUr, escHtml)}</span><span><span class="ltr">${escHtml(site.phoneDisplay2)}</span> &nbsp;|&nbsp; <span class="ltr">${web}</span></span></div></div>`;
  }
  return `<div class="hdr"><img src="/images/logo.png" alt="${escHtml(site.name)}"><div class="co"><b>${escHtml(site.fullName)}</b><span>${escHtml(site.address)}</span><span>${escHtml(site.phoneDisplay2)} &nbsp;|&nbsp; ${web}</span></div></div>`;
}

/** The company line at the bottom of every printed page. `extra` (an agreement number) is shown as given. */
export function footerHtml(extra?: string, lang: "en" | "ur" = "en"): string {
  if (lang === "ur") {
    return `<div class="ftr ur">${escHtml(site.fullNameUr)} &nbsp;|&nbsp; ${ltrHtml(site.addressUr, escHtml)} &nbsp;|&nbsp; <span class="ltr">${escHtml(site.phoneDisplay2)}</span>${extra ? ` &nbsp;|&nbsp; ${extra}` : ""}</div>`;
  }
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

  // The parties' names are printed in bold wherever they appear in the wording.
  const names = [pick(data.owner.name, data.owner.nameUr), pick(data.tenant.name, data.tenant.nameUr)].filter(Boolean);
  const bold = (raw: string) => {
    let text = raw;
    for (const n of names) text = text.split(n).join("" + n + "");
    return t(text).replace(//g, "<b>").replace(//g, "</b>");
  };

  const cnicLabel = lang === "ur" ? "شناختی کارڈ نمبر:" : "CNIC:";
  const sig = (en: string, ur: string, name: string, nameUr: string, cnic: string, showCnic = true, witness = false) => {
    const who = pick(name, nameUr);
    const head = lang === "ur" ? `<div class="lbl">${witness ? ur : "العبد"}</div>` : `<div class="lbl">${en}</div>`;
    const role = lang === "ur" && !witness ? ` (${ur})` : "";
    return `<div>${head}<div class="sigline"></div>${who ? `<div class="nm"><b>${t(who)}</b>${role}</div>` : role ? `<div class="nm">${role}</div>` : ""}${showCnic && cnic.trim() ? `<div class="cn">${cnicLabel} <span class="ltr">${escHtml(cnic.trim())}</span></div>` : ""}</div>`;
  };
  const w = data.witnesses;
  // Company letterhead is printed on A4; stamp paper is Legal with the top left empty for the stamp.
  const page = PAGES[stamp ? "legal" : "a4"];
  const rows: (string | { html: string; keep: boolean })[] = [];
  if (stamp) rows.push('<div class="stampspace"></div>');

  const refHtml = agreementNo
    ? lang === "ur"
      ? `<div class="ref" style="direction:rtl;text-align:left;font-family:${UR_FONT};font-size:10pt">معاہدہ نمبر: <span class="ltr">${escHtml(agreementNo)}</span></div>`
      : `<div class="ref">Agreement No. ${escHtml(agreementNo)}</div>`
    : "";
  const titleHtml = lang === "ur" ? `اقرار نامہ <small>کرایہ داری</small>` : escHtml(c.title.en);
  rows.push({ keep: true, html: `<div class="title">${titleHtml}</div>${refHtml}` });
  for (const p of c.intro) rows.push(`<p class="para">${bold(p[lang])}</p>`);

  const extra = c.extra;
  if (lang === "ur") {
    // Urdu agreements run the terms on as one justified paragraph, each term starting with its number.
    const parts = c.clauses.map((p, i) => `<b class="n">${i + 1})..</b> ${t(p.ur)}`);
    extra.forEach((x, i) => parts.push(`<b class="n">${c.clauses.length + i + 1})..</b> ${escHtml(x)}`));
    parts.push(t(c.closing.ur));
    rows.push(`<p class="flow">${parts.join(" ")}</p>`);
  } else {
    c.clauses.forEach((p, i) => rows.push(`<div class="clause"><span class="no">${i + 1}.</span><div class="txt">${t(p.en)}</div></div>`));
    extra.forEach((x, i) => rows.push(`<div class="clause"><span class="no">${c.clauses.length + i + 1}.</span><div class="txt" dir="auto">${escHtml(x)}</div></div>`));
  }

  rows.push({
    keep: true,
    html: `${lang === "ur" ? "" : `<p class="closing">${t(c.closing.en)}</p>`}
  <div class="signs">
    <div class="row2">${sig("Owner", "مالک مذکور", data.owner.name, data.owner.nameUr, data.owner.cnic, lang !== "ur")}${sig("Tenant", "کرایہ دار", data.tenant.name, data.tenant.nameUr, data.tenant.cnic, lang !== "ur")}</div>
    <div class="row2 wit">${sig("Witness 1", "گواہ شد (1)", w[0]?.name ?? "", w[0]?.nameUr ?? "", w[0]?.cnic ?? "", true, true)}${sig("Witness 2", "گواہ شد (2)", w[1]?.name ?? "", w[1]?.nameUr ?? "", w[1]?.cnic ?? "", true, true)}</div>
  </div>`,
  });

  const gaps = lang === "ur" ? urduGaps(data) : [];
  const footerRef = agreementNo ? (lang === "ur" ? `معاہدہ نمبر <span class="ltr">${escHtml(agreementNo)}</span>` : agreementNo) : undefined;

  return `<!doctype html>
<html lang="${lang === "ur" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rent Agreement${agreementNo ? ` ${escHtml(agreementNo)}` : ""}</title>
<style>${buildPrintStyle(page)}</style>
</head>
<body class="lang-${lang} paper-${data.paper}">
<div class="bar" dir="ltr">
  <button type="button" id="print-btn">Print / Save as PDF</button>
  <a href="docx" title="Download the same agreement as an editable Word file">Word (.docx)</a>
  <a href="javascript:history.back()">Back</a>
  <small>In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), paper ${stamp ? "Legal" : "A4"}, turn ON &ldquo;Background graphics&rdquo;. ${stamp ? "The top of the first page is left empty for the stamp." : "The company letterhead is printed at the top of every page."}</small>
  ${gaps.length ? `<small style="color:#ffd7d7;flex-basis:100%">Urdu agreement: these are still in English, write them in Urdu too (edit the agreement, Urdu boxes) so the printed page is all Urdu: ${escHtml(gaps.join(", "))}.</small>` : ""}
</div>
<div class="page" dir="${dir}">
${stamp ? "" : '<div class="frame"></div>'}
${docTableHtml({ head: stamp ? '<div class="stamptop"></div>' : letterheadHtml(lang), rows, footer: footerHtml(footerRef, lang) })}
</div>
<script>document.getElementById("print-btn").addEventListener("click", function () { window.print(); });</script>
${fitScript(page.h, 2, 0.55)}
</body>
</html>`;
}
