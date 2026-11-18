"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { site } from "@/lib/site";
import { PRINT_KIT_CSS, PrintTips, inputClass } from "./printKit";

// The company profile brochure: one A4 sheet, front (who we are) and back (services and how to
// reach us). Print both pages on one sheet (two-sided) or save as PDF to send on WhatsApp.

const DEFAULT_SERVICES = [
  "Buying and selling of houses, plots, flats and commercial property",
  "Rental services and property management",
  "House construction and building work",
  "Property investment advice",
  "Legal and documentation support (agreements, receipts, transfer)",
  "Maintenance and house design",
].join("\n");

const DEFAULT_WHY = [
  "Verified properties and clear documents",
  "Honest advice - no hidden charges",
  "Help from the first visit to the registry",
  "Agreements and receipts in Urdu or English, ready the same day",
].join("\n");

const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export function CompanyProfileMaker({ qrWebsite }: { qrWebsite: string }) {
  const [about, setAbout] = useState(site.description);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [why, setWhy] = useState(DEFAULT_WHY);
  const web = site.websiteUrl.replace(/^https?:\/\//, "");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
      <style>{PRINT_KIT_CSS}</style>
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">About us</span>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Why choose us (one per line)</span>
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={5} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Our services (one per line)</span>
          <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={7} className={inputClass} />
        </label>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Printer className="h-4 w-4" /> Print both pages
        </button>
        <PrintTips extra="Two pages: print two-sided, or save as PDF. For many copies, give the PDF to a printing press." />
      </div>

      <div className="pk-root overflow-x-auto">
        {/* Page 1 - who we are */}
        <div className="pk-sheet">
          <div style={{ background: "#c81e2c", color: "#fff", height: "112mm", padding: "16mm 16mm 0", position: "relative" }}>
            <div style={{ background: "#fff", display: "inline-block", borderRadius: "3mm", padding: "3mm 6mm" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt={site.name} style={{ height: "26mm", width: "auto", display: "block" }} />
            </div>
            <div style={{ fontSize: "34pt", fontWeight: 900, lineHeight: 1.1, marginTop: "14mm", letterSpacing: "1px" }}>{site.tagline}</div>
            <div style={{ fontSize: "34pt", fontWeight: 900, lineHeight: 1.1, opacity: 0.92 }}>{site.taglineSecondary}</div>
            <div style={{ position: "absolute", left: "16mm", bottom: "9mm", fontSize: "15pt", letterSpacing: "1px" }}>Buy &bull; Sell &bull; Rent &bull; Build &nbsp;|&nbsp; Lahore</div>
          </div>
          <div style={{ padding: "14mm 16mm 0" }}>
            <div style={{ fontSize: "20pt", fontWeight: 800 }}>
              About <span className="pk-red">{site.name}</span>
            </div>
            <div style={{ fontSize: "12.5pt", lineHeight: 1.6, marginTop: "4mm", color: "#333" }}>{about}</div>
            <div style={{ fontSize: "16pt", fontWeight: 800, marginTop: "10mm" }}>Why choose us</div>
            <div style={{ marginTop: "3mm" }}>
              {lines(why).map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "4mm", fontSize: "12.5pt", lineHeight: 1.5, marginBottom: "2.5mm" }}>
                  <span className="pk-red" style={{ fontWeight: 900 }}>&#10003;</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#17110f", color: "#fff", padding: "6mm 16mm", fontSize: "12pt", display: "flex", justifyContent: "space-between" }}>
            <span>{site.phoneDisplay2}</span>
            <span>{web}</span>
          </div>
        </div>

        {/* Page 2 - services and contact */}
        <div className="pk-sheet">
          <div style={{ padding: "16mm 16mm 0" }}>
            <div style={{ fontSize: "24pt", fontWeight: 900 }}>
              Our <span className="pk-red">Services</span>
            </div>
            <div style={{ height: "1.2mm", width: "30mm", background: "#c81e2c", margin: "3mm 0 8mm" }} />
            {lines(services).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "5mm", alignItems: "flex-start", border: "0.4mm solid #e5e5e5", borderLeft: "1.6mm solid #c81e2c", borderRadius: "1.5mm", padding: "4mm 5mm", marginBottom: "4mm", fontSize: "13pt", lineHeight: 1.45 }}>
                <span className="pk-red" style={{ fontWeight: 900 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#c81e2c", color: "#fff", padding: "10mm 16mm", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8mm" }}>
            <div style={{ fontSize: "13pt", lineHeight: 1.7 }}>
              <div style={{ fontSize: "19pt", fontWeight: 900, marginBottom: "2mm" }}>Contact us</div>
              <div>Phone / WhatsApp: {site.phoneDisplay2}</div>
              <div>Email: {site.displayEmail}</div>
              <div>Office: {site.address}</div>
              <div>Web: {web}</div>
              <div style={{ fontSize: "10.5pt", opacity: 0.9, marginTop: "2mm" }}>Facebook / Instagram / TikTok: @5star.m.23</div>
            </div>
            <div style={{ background: "#fff", padding: "2.5mm", borderRadius: "2mm", textAlign: "center", color: "#1a1a1a", fontSize: "8pt" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrWebsite} alt="QR code" style={{ width: "38mm", height: "38mm", display: "block" }} />
              Scan to visit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
