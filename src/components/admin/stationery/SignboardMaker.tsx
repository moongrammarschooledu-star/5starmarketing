"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { site } from "@/lib/site";
import { PRINT_KIT_CSS, PrintTips, inputClass } from "./printKit";

// A big A4 poster for a property: FOR SALE / FOR RENT, the details, a huge phone number and a QR
// code. Print it on A4, or enlarge to A3 in the print window, and stick it on the property.

export function SignboardMaker({ qrWebsite, qrWhatsapp }: { qrWebsite: string; qrWhatsapp: string }) {
  const [headline, setHeadline] = useState("FOR SALE");
  const [line1, setLine1] = useState("10 Marla House");
  const [line2, setLine2] = useState("Johar Town, Lahore");
  const [line3, setLine3] = useState("");
  const [extra, setExtra] = useState("");
  const [phone, setPhone] = useState(site.phoneDisplay2);
  const [qr, setQr] = useState<"whatsapp" | "website" | "none">("whatsapp");
  const qrSrc = qr === "whatsapp" ? qrWhatsapp : qr === "website" ? qrWebsite : null;
  const web = site.websiteUrl.replace(/^https?:\/\//, "");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
      <style>{PRINT_KIT_CSS}</style>
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Heading</span>
          <select value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass}>
            {["FOR SALE", "FOR RENT", "TO LET", "SOLD", "RENTED", "AVAILABLE", "UNDER OFFER"].map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Line 1 (size / type)</span>
          <input dir="auto" value={line1} onChange={(e) => setLine1(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Line 2 (location)</span>
          <input dir="auto" value={line2} onChange={(e) => setLine2(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Line 3 (price / rent - optional)</span>
          <input dir="auto" value={line3} onChange={(e) => setLine3(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Small extra line (optional)</span>
          <input dir="auto" value={extra} onChange={(e) => setExtra(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Phone number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">QR code</span>
          <select value={qr} onChange={(e) => setQr(e.target.value as "whatsapp" | "website" | "none")} className={inputClass}>
            <option value="whatsapp">WhatsApp chat</option>
            <option value="website">Website</option>
            <option value="none">No QR code</option>
          </select>
        </label>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Printer className="h-4 w-4" /> Print the poster
        </button>
        <PrintTips extra="For a bigger sign choose A3 paper and the same scale, or save as PDF for a printing press." />
      </div>

      <div className="pk-root overflow-x-auto">
        <div className="pk-sheet" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#c81e2c", color: "#fff", textAlign: "center", padding: "16mm 8mm 12mm" }}>
            <div style={{ fontSize: "82pt", fontWeight: 900, letterSpacing: "4px", lineHeight: 1 }}>{headline}</div>
          </div>
          <div style={{ flex: 1, padding: "14mm 14mm 6mm", textAlign: "center" }}>
            <div style={{ fontSize: "40pt", fontWeight: 800, lineHeight: 1.15 }}>{line1}</div>
            <div style={{ fontSize: "28pt", marginTop: "4mm", color: "#444" }}>{line2}</div>
            {line3 && <div style={{ fontSize: "34pt", fontWeight: 800, marginTop: "6mm", color: "#c81e2c" }}>{line3}</div>}
            {extra && <div style={{ fontSize: "16pt", marginTop: "6mm", color: "#555" }}>{extra}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10mm", padding: "0 12mm 8mm" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18pt", color: "#555" }}>Call / WhatsApp</div>
              <div style={{ fontSize: "44pt", fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>{phone}</div>
            </div>
            {qrSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt="QR code" style={{ width: "46mm", height: "46mm", border: "1mm solid #1a1a1a" }} />
            )}
          </div>
          <div style={{ borderTop: "3mm solid #c81e2c", padding: "6mm 12mm", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt={site.name} style={{ height: "22mm", width: "auto" }} />
            <div style={{ textAlign: "right", fontSize: "13pt", lineHeight: 1.5 }}>
              <div style={{ fontWeight: 800, fontSize: "16pt" }}>{site.fullName}</div>
              <div>{site.addressShort}</div>
              <div>{web}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
