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


  const sig = (en: string, ur: string, name: string, nameUr: string, cnic: string) =>
    `<div><div class="lbl">${lang === "ur" ? ur : en}</div><div class="sigline"></div>${pick(name, nameUr) ? `<div class="nm">${t(pick(name, nameUr))}</div>` : ""}${cnic.trim() ? `<div class="cn">CNIC: ${escHtml(cnic.trim())}</div>` : ""}</div>`;
  const thumb = `<div><div class="thumb"></div><div class="cap">${lang === "ur" ? "انگوٹھا" : "Thumb impression"}</div></div>`;
  const w = data.witnesses;
  const page = PAGES[data.pageSize === "a4" ? "a4" : "legal"];
  const rows: (string | { html: string; keep: boolean })[] = [];
  if (stamp) rows.push('<div class="stampspace"></div>');
  rows.push({ keep: true, html: `<div class="title">${escHtml(c.title[lang])}</div>${agreementNo ? `<div class="ref">Agreement No. ${escHtml(agreementNo)}</div>` : ""}` });
  for (const p of c.intro) rows.push(`<p class="para">${t(p[lang])}</p>`);
  c.clauses.forEach((p, i) => rows.push(`<div class="clause"><span class="no">${i + 1}.</span><div class="txt">${t(p[lang])}</div></div>`));
  c.extra.forEach((x, i) => rows.push(`<div class="clause"><span class="no">${c.clauses.length + i + 1}.</span><div class="txt" dir="auto">${escHtml(x)}</div></div>`));
  const note =
    lang === "ur"
      ? `یہ اقرار نامہ فریقین کی فراہم کردہ معلومات پر ${site.fullName} نے تیار کیا ہے۔ دستخط سے پہلے پورا اقرار نامہ پڑھ لیں۔`
      : `Prepared by ${site.fullName} on the information given by the parties. Please read the whole agreement before signing.`;

  rows.push({ keep: true, html: `<p class="closing">${t(c.closing[lang])}</p>
  <div class="signs">
    <div class="row2">${thumb}${thumb}</div>
    <div class="row2">${sig("Seller (First Party)", "فریقِ اول (فروخت کنندہ)", data.seller.name, data.seller.nameUr, data.seller.cnic)}${sig("Buyer (Second Party)", "فریقِ دوم (خریدار)", data.buyer.name, data.buyer.nameUr, data.buyer.cnic)}</div>
    <div class="row2">${sig("Witness 1", "گواہ شد (1)", w[0]?.name ?? "", w[0]?.nameUr ?? "", w[0]?.cnic ?? "")}${sig("Witness 2", "گواہ شد (2)", w[1]?.name ?? "", w[1]?.nameUr ?? "", w[1]?.cnic ?? "")}</div>
    ${data.commissionPercent > 0 ? `<div class="row2">${sig(`For ${site.name} (Dealer)`, `برائے ${site.name} (ڈیلر)`, "", "", "")}<div></div></div>` : ""}
    <div class="note">${escHtml(note)}</div>
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
  <a href="javascript:history.back()">Back</a>
  <small>In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), paper ${data.pageSize === "a4" ? "A4" : "Legal"}, turn ON &ldquo;Background graphics&rdquo;. ${stamp ? "The top of the first page is left empty for the stamp." : "The company letterhead is printed at the top of every page."}</small>
</div>
<div class="page" dir="${dir}">
${docTableHtml({ head: stamp ? '<div class="stamptop"></div>' : letterheadHtml(), rows, footer: footerHtml(agreementNo) })}
</div>
<script>document.getElementById("print-btn").addEventListener("click", function () { window.print(); });</script>
${fitScript(page.h, 2, 0.8)}
</body>
</html>`;
}
