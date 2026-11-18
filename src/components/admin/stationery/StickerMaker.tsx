"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { site } from "@/lib/site";
import { PRINT_KIT_CSS, PrintTips, inputClass } from "./printKit";

// Sheets of company stickers: round logo stickers, address/phone labels, and FOR SALE / FOR RENT /
// SOLD stickers for property signs and files. A whole A4 sheet is filled; cut along the lines.

type Kind = "round" | "label" | "sale";

const LAYOUT: Record<Kind, { cols: number; rows: number; w: number; h: number; gx: number; gy: number }> = {
  round: { cols: 3, rows: 5, w: 52, h: 52, gx: 4, gy: 4 },
  label: { cols: 2, rows: 6, w: 84, h: 40, gx: 6, gy: 6 },
  sale: { cols: 2, rows: 5, w: 96, h: 48, gx: 4, gy: 6 },
};

export function StickerMaker() {
  const [kind, setKind] = useState<Kind>("round");
  const [headline, setHeadline] = useState("FOR SALE");
  const [phone, setPhone] = useState(site.phoneDisplay2);
  const [cutLines, setCutLines] = useState(true);
  const L = LAYOUT[kind];
  const count = L.cols * L.rows;
  const padX = (210 - (L.cols * L.w + (L.cols - 1) * L.gx)) / 2;
  const padY = (297 - (L.rows * L.h + (L.rows - 1) * L.gy)) / 2;
  const web = site.websiteUrl.replace(/^https?:\/\//, "");

  const cell = (i: number) => {
    if (kind === "round")
      return (
        <div key={i} style={{ width: `${L.w}mm`, height: `${L.h}mm`, borderRadius: "50%", border: "1.6mm solid #c81e2c", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", outline: cutLines ? "0.2mm dashed #aaa" : "none", outlineOffset: "0.6mm" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt={site.name} style={{ width: "36mm", height: "auto" }} />
        </div>
      );
    if (kind === "label")
      return (
        <div key={i} style={{ width: `${L.w}mm`, height: `${L.h}mm`, border: "0.5mm solid #c81e2c", borderRadius: "2mm", background: "#fff", display: "flex", alignItems: "center", gap: "4mm", padding: "3mm", boxSizing: "border-box", outline: cutLines ? "0.2mm dashed #aaa" : "none", outlineOffset: "0.6mm" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt={site.name} style={{ height: "22mm", width: "auto" }} />
          <div style={{ fontSize: "7.5pt", lineHeight: 1.45 }}>
            <div style={{ fontWeight: 700, fontSize: "10pt" }}>{site.fullName}</div>
            <div>{site.addressShort}</div>
            <div style={{ fontWeight: 700, color: "#c81e2c" }}>{phone}</div>
            <div>{web}</div>
          </div>
        </div>
      );
    return (
      <div key={i} style={{ width: `${L.w}mm`, height: `${L.h}mm`, border: "0.5mm solid #c81e2c", borderRadius: "2mm", background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column", boxSizing: "border-box", outline: cutLines ? "0.2mm dashed #aaa" : "none", outlineOffset: "0.6mm" }}>
        <div style={{ background: "#c81e2c", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: "20pt", letterSpacing: "2px", padding: "1.5mm 0" }}>{headline}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4mm" }}>
          <div>
            <div style={{ fontSize: "6.5pt", color: "#555" }}>Call / WhatsApp</div>
            <div style={{ fontSize: "17pt", fontWeight: 800 }}>{phone}</div>
            <div style={{ fontSize: "6.5pt", color: "#555" }}>{web}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt={site.name} style={{ height: "15mm", width: "auto" }} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
      <style>{PRINT_KIT_CSS}</style>
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Sticker</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={inputClass}>
            <option value="round">Round logo sticker (52 mm) - 15 per sheet</option>
            <option value="label">Address label (84 x 40 mm) - 12 per sheet</option>
            <option value="sale">For Sale / For Rent sticker (96 x 48 mm) - 10 per sheet</option>
          </select>
        </label>
        {kind === "sale" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Heading</span>
            <select value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass}>
              {["FOR SALE", "FOR RENT", "TO LET", "SOLD", "RENTED", "AVAILABLE"].map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
        )}
        {kind !== "round" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Phone number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </label>
        )}
        <label className="flex items-center gap-2.5 font-semibold text-ink">
          <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} className="h-4 w-4 accent-primary" />
          Print thin cutting lines
        </label>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Printer className="h-4 w-4" /> Print the sheet ({count} stickers)
        </button>
        <PrintTips extra="Print on sticker paper (A4 glossy or matt); for a printing press, save as PDF." />
      </div>

      <div className="pk-root overflow-x-auto">
        <div className="pk-sheet" style={{ padding: `${padY}mm ${padX}mm`, display: "grid", gridTemplateColumns: `repeat(${L.cols}, ${L.w}mm)`, gridAutoRows: `${L.h}mm`, columnGap: `${L.gx}mm`, rowGap: `${L.gy}mm` }}>
          {Array.from({ length: count }, (_, i) => cell(i))}
        </div>
      </div>
    </div>
  );
}
