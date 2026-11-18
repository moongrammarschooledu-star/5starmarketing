"use client";

// Shared pieces of the printable stationery tools (stickers, signboard, brochure, stamp, ID card):
// the on-screen preview of a sheet and the rules that make the browser print only that sheet,
// on A4, with no margins. Each tool puts its sheets inside <div className="pk-root">.

export const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";

export const PRINT_KIT_CSS = `
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Bold.ttf") format("truetype"); font-weight: 700; }
.pk-sheet { position: relative; width: 210mm; height: 297mm; background: #fff; color: #1a1a1a; box-sizing: border-box; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.2); margin: 0 0 14px; zoom: 0.55; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, Helvetica, sans-serif; break-after: page; }
.pk-ur { font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; direction: rtl; }
.pk-red { color: #c81e2c; }
.pk-hide-back .pk-back, .pk-hide-front .pk-front { display: none; }
@media print {
  @page { size: A4; margin: 0; }
  body * { visibility: hidden !important; }
  .pk-root, .pk-root * { visibility: visible !important; }
  .pk-root { position: absolute; left: 0; top: 0; }
  .pk-sheet { zoom: 1 !important; box-shadow: none !important; margin: 0 !important; }
  .pk-printing-front .pk-back { display: none !important; }
  .pk-printing-back .pk-front { display: none !important; }
  .pk-noprint { display: none !important; }
}
`;

export function PrintTips({ extra }: { extra?: string }) {
  return (
    <p className="text-xs text-muted">
      In the print window: paper A4, scale 100% (not &ldquo;fit to page&rdquo;), Margins &ldquo;None&rdquo;, turn OFF &ldquo;Headers and footers&rdquo; and turn ON &ldquo;Background graphics&rdquo;. {extra}
    </p>
  );
}
