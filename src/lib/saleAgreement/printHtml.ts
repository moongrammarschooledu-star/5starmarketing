import { site } from "@/lib/site";
import { PAGES, buildPrintStyle, docTableHtml, escHtml, fitScript, footerHtml, letterheadHtml } from "@/lib/rentAgreement/printHtml";
import { ltrHtml } from "@/lib/rentAgreement/bidi";
import { buildSaleContent } from "./content";
import type { SaleAgreementData } from "./types";

// The sale agreement as a page for the browser to print or "Save as PDF" - Urdu in real
// Nastaleeq or English, with the company letterhead (plain paper) or an empty space for the
// stamp (stamp paper). Same look as the rent agreement.

export function renderSaleHtml(data: SaleAgreementData, agreementNo?: string): string {
  const c = buildSaleContent(data);
  const lang: "ur" | "en" = data.language === "en" ? "en" : "ur";
  const stamp = data.paper === "stamp";
  const dir = lang === "ur" ? "rtl" : "ltr";
  const pick = (en: string, ur: string) => (lang === "ur" ? ur.trim() || en.trim() : en.trim());
  // Keeps numbers and English words in their own left-to-right order inside Urdu lines.
  const t = (text: string) => (lang === "ur" ? ltrHtml(text, escHtml) : escHtml(text));


  const sig = (en: string, ur: string, name: string, nameUr: string, cnic: string, witness = false) =>
    `<div><div class="lbl">${lang === "ur" ? (witness ? ur : "العبد") : en}</div><div class="sigline"></div>${pick(name, nameUr) ? `<div class="nm"><b>${t(pick(name, nameUr))}</b>${lang === "ur" && !witness ? ` (${ur})` : ""}</div>` : ""}${cnic.trim() ? `<div class="cn">${lang === "ur" ? "شناختی کارڈ نمبر:" : "CNIC:"} <span class="ltr">${escHtml(cnic.trim())}</span></div>` : ""}</div>`;
  const w = data.witnesses;
  const page = PAGES[stamp ? "legal" : "a4"];
  const rows: (string | { html: string; keep: boolean })[] = [];
  if (stamp) rows.push('<div class="stampspace"></div>');
  rows.push({ keep: true, html: `<div class="title">${escHtml(c.title[lang])}</div>${agreementNo ? `<div class="ref"${lang === "ur" ? ` style="direction:rtl;text-align:left;font-size:10pt"` : ""}>${lang === "ur" ? "معاہدہ نمبر:" : "Agreement No."} <span class="ltr">${escHtml(agreementNo)}</span></div>` : ""}` });
  for (const p of c.intro) rows.push(`<p class="para">${t(p[lang])}</p>`);
  c.clauses.forEach((p, i) => rows.push(`<div class="clause"><span class="no">${i + 1}.</span><div class="txt">${t(p[lang])}</div></div>`));
  c.extra.forEach((x, i) => rows.push(`<div class="clause"><span class="no">${c.clauses.length + i + 1}.</span><div class="txt" dir="auto">${escHtml(x)}</div></div>`));

  rows.push({ keep: true, html: `<p class="closing">${t(c.closing[lang])}</p>
  <div class="signs">
    <div class="row2">${sig("Seller (First Party)", "فروخت کنندہ", data.seller.name, data.seller.nameUr, data.seller.cnic)}${sig("Buyer (Second Party)", "خریدار", data.buyer.name, data.buyer.nameUr, data.buyer.cnic)}</div>
    <div class="row2 wit">${sig("Witness 1", "گواہ شد (1)", w[0]?.name ?? "", w[0]?.nameUr ?? "", w[0]?.cnic ?? "", true)}${sig("Witness 2", "گواہ شد (2)", w[1]?.name ?? "", w[1]?.nameUr ?? "", w[1]?.cnic ?? "", true)}</div>
    ${data.commissionPercent > 0 ? `<div class="row2">${sig(`For ${site.name} (Dealer)`, "ڈیلر", site.fullName, site.fullNameUr, "")}<div></div></div>` : ""}
  </div>` });

  return `<!doctype html>
<html lang="${lang === "ur" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sale Agreement${agreementNo ? ` ${escHtml(agreementNo)}` : ""}</title>
<style>${buildPrintStyle(page)}</style>
</head>
<body class="lang-${lang} paper-${data.paper}">
<div class="bar" dir="ltr">
  <button type="button" id="print-btn">Print / Save as PDF</button>
  <a href="docx" title="Download the same agreement as an editable Word file">Word (.docx)</a>
  <a href="javascript:history.back()">Back</a>
  <small>In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), paper ${stamp ? "Legal" : "A4"}, turn ON &ldquo;Background graphics&rdquo;. ${stamp ? "The top of the first page is left empty for the stamp." : "The company letterhead is printed at the top of every page."}</small>
</div>
<div class="page" dir="${dir}">
${stamp ? "" : '<div class="frame"></div>'}
${docTableHtml({ head: stamp ? '<div class="stamptop"></div>' : letterheadHtml(lang), rows, footer: footerHtml(agreementNo ? (lang === "ur" ? `معاہدہ نمبر <span class="ltr">${escHtml(agreementNo)}</span>` : agreementNo) : undefined, lang) })}
</div>
<script>document.getElementById("print-btn").addEventListener("click", function () { window.print(); });</script>
${fitScript(page.h, 2, 0.55)}
</body>
</html>`;
}
