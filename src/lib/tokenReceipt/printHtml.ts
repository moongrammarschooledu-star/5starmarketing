import { PRINT_STYLE, escHtml, letterheadHtml } from "@/lib/rentAgreement/printHtml";
import { ltrHtml } from "@/lib/rentAgreement/bidi";
import { pick } from "@/lib/rentAgreement/content";
import { fmtDate } from "@/lib/rentAgreement/content";
import { buildTokenContent } from "./content";
import type { TokenReceiptData } from "./types";

// The token receipt as a page for the browser to print or "Save as PDF" (Urdu in real Nastaleeq).
// One copy fills the page; with two copies a client copy and an office copy share one A4 page.

const EXTRA_STYLE = `
@page { size: A4; margin: 0; }
.tok .page { padding: 8mm 12mm; }
.tok.lang-ur .page { font-size: 12pt; line-height: 2.2; }
.tok.lang-en .page { font-size: 11pt; line-height: 1.45; }
.tok .copy { position: relative; break-inside: avoid; padding-bottom: 4px; }
.tok .hdr { position: static; margin: 0 0 8px; }
.tok .hdr img { height: 52px; }
.tok .tag { position: absolute; top: 2px; left: 50%; transform: translateX(-50%); font: 700 8pt Arial, Helvetica, sans-serif; color: #888; text-transform: uppercase; letter-spacing: 1px; direction: ltr; }
.tok .meta { display: flex; justify-content: space-between; font: 600 10pt Arial, Helvetica, sans-serif; color: #333; margin: 0 0 6px; direction: ltr; }
.tok .amountbox { display: inline-block; border: 1.4px solid #1a1a1a; padding: 2px 14px; font: 700 14pt Arial, Helvetica, sans-serif; direction: ltr; margin: 2px 0 6px; }
.tok .clause { margin: 0 0 2px; }
.tok .sign3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-top: 12px; align-items: end; }
.tok .stampbox { height: 62px; border: 1px dashed #888; display: flex; align-items: flex-end; justify-content: center; font: 8pt Arial, Helvetica, sans-serif; color: #888; }
.tok .cut { border-top: 1.5px dashed #999; margin: 8mm 0; text-align: center; font: 9pt Arial, Helvetica, sans-serif; color: #888; height: 0; line-height: 0; }
.tok .cut span { background: #fff; padding: 0 8px; }
@media print {
  .tok .page { padding: 10mm 14mm; }
  .tok .hdr { position: static; }
  .tok .cut { margin: 7mm 0; }
}
`;

export function renderTokenHtml(data: TokenReceiptData, receiptNo?: string): string {
  const c = buildTokenContent(data);
  const lang: "ur" | "en" = data.language === "en" ? "en" : "ur";
  const dir = lang === "ur" ? "rtl" : "ltr";
  const t = (text: string) => (lang === "ur" ? ltrHtml(text, escHtml) : escHtml(text));

  const copy = (tag: string) => {
    const terms = c.terms.map((p, i) => `<div class="clause"><span class="no">${i + 1}.</span><div class="txt">${t(p[lang])}</div></div>`).join("");
    const extras = c.extra.map((x, i) => `<div class="clause"><span class="no">${c.terms.length + i + 1}.</span><div class="txt" dir="auto">${escHtml(x)}</div></div>`).join("");
    const receiver = pick(lang === "ur" ? data.receivedByUr : data.receivedBy, lang === "ur" ? data.receivedBy : "");
    return `<section class="copy">
  ${data.copies === 2 ? `<div class="tag">${escHtml(tag)}</div>` : ""}
  ${letterheadHtml()}
  <div class="title">${escHtml(c.title[lang])}</div>
  <div class="meta"><span>${receiptNo ? `Receipt No. ${escHtml(receiptNo)}` : ""}</span><span>Date: ${escHtml(fmtDate(data.receiptDate))}</span></div>
  <div class="amountbox">Rs. ${escHtml(Math.round(data.amount).toLocaleString("en-IN"))}/-</div>
  <p class="para">${t(c.body[lang])}</p>
  ${terms}${extras}
  <div class="sign3">
    <div><div class="sigline"></div><div class="lbl">${escHtml(c.signLabels.receiver[lang])}</div>${receiver ? `<div class="nm">${t(receiver)}</div>` : ""}</div>
    <div><div class="sigline"></div><div class="lbl">${escHtml(c.signLabels.client[lang])}</div><div class="nm">${t(lang === "ur" ? pick(data.payer.nameUr, data.payer.name) : data.payer.name.trim())}</div></div>
    <div class="stampbox">${lang === "ur" ? "مہر" : "Stamp"}</div>
  </div>
</section>`;
  };

  const body =
    data.copies === 2
      ? `${copy(lang === "ur" ? "Client copy" : "Client copy")}<div class="cut"><span>&#9986; cut here</span></div>${copy("Office copy")}`
      : copy("Client copy");

  return `<!doctype html>
<html lang="${lang === "ur" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Token Receipt${receiptNo ? ` ${escHtml(receiptNo)}` : ""}</title>
<style>${PRINT_STYLE}${EXTRA_STYLE}</style>
</head>
<body class="tok lang-${lang}">
<div class="bar" dir="ltr">
  <button type="button" id="print-btn">Print / Save as PDF</button>
  <a href="javascript:history.back()">Back</a>
  <small>In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), paper A4, turn ON &ldquo;Background graphics&rdquo;.</small>
</div>
<div class="page" dir="${dir}">
${body}
</div>
<script>document.getElementById("print-btn").addEventListener("click", function () { window.print(); });</script>
</body>
</html>`;
}
