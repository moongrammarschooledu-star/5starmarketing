"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { site } from "@/lib/site";
import { PRINT_KIT_CSS, printIsolated, PrintTips, inputClass } from "./printKit";

// Artwork for the company rubber stamp / seal: a round seal and a rectangular stamp, drawn as
// black vector shapes. Download the SVG (or print it) and hand it to the stamp maker.

type Style = "round" | "rect";

/** Text size that keeps a line on its arc: the arc is about `room` units long and a letter is about 0.72 of the size wide. */
const fit = (text: string, room: number, max: number) => Math.max(8, Math.min(max, room / (Math.max(text.length, 1) * 0.74)));

function RoundSeal({ top, bottom, center, mm }: { top: string; bottom: string; center: string; mm: number }) {
  return (
    <svg id="stamp-round" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={`${mm}mm`} height={`${mm}mm`} fontFamily="Arial, Helvetica, sans-serif" fill="#000">
      <defs>
        <path id="arc-top" d="M 100,100 m -73,0 a 73,73 0 1,1 146,0" />
        <path id="arc-bottom" d="M 100,100 m -82,0 a 82,82 0 0,0 164,0" />
      </defs>
      <circle cx="100" cy="100" r="97" fill="none" stroke="#000" strokeWidth="4" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="#000" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="56" fill="none" stroke="#000" strokeWidth="2" />
      <text fontSize={fit(top, 205, 17)} fontWeight="700" letterSpacing="0.6" textAnchor="middle">
        <textPath href="#arc-top" startOffset="50%">{top}</textPath>
      </text>
      <text fontSize={fit(bottom, 225, 13)} fontWeight="700" letterSpacing="0.8" textAnchor="middle">
        <textPath href="#arc-bottom" startOffset="50%">{bottom}</textPath>
      </text>
      <text x="100" y="96" fontSize={fit(center, 92, 22)} fontWeight="800" textAnchor="middle">{center}</text>
      <text x="100" y="114" fontSize="9" fontWeight="700" letterSpacing="1" textAnchor="middle">ESTATE &amp; BUILDERS</text>
      <text x="100" y="136" fontSize="14" textAnchor="middle">&#9733;</text>
    </svg>
  );
}

function RectStamp({ name, sub, address, phone, signature, w, h }: { name: string; sub: string; address: string; phone: string; signature: boolean; w: number; h: number }) {
  return (
    <svg id="stamp-rect" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width={`${w}mm`} height={`${h}mm`} fontFamily="Arial, Helvetica, sans-serif" fill="#000">
      <rect x="3" y="3" width="234" height="114" rx="8" fill="none" stroke="#000" strokeWidth="3.5" />
      <rect x="9" y="9" width="222" height="102" rx="5" fill="none" stroke="#000" strokeWidth="1" />
      <text x="120" y="38" fontSize="25" fontWeight="800" textAnchor="middle">{name}</text>
      <text x="120" y="58" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="middle">{sub}</text>
      <text x="120" y="78" fontSize="11" textAnchor="middle">{address}</text>
      <text x="120" y="94" fontSize="11" textAnchor="middle">Ph: {phone}</text>
      {signature && <text x="120" y="108" fontSize="8" textAnchor="middle" letterSpacing="1">AUTHORISED SIGNATURE</text>}
    </svg>
  );
}

export function StampMaker() {
  const [style, setStyle] = useState<Style>("round");
  const [mm, setMm] = useState(40);
  const [top, setTop] = useState("5STAR.M ESTATE & BUILDERS");
  const [bottom, setBottom] = useState("LAHORE - PAKISTAN");
  const [center, setCenter] = useState("5STAR.M");
  const [name, setName] = useState(site.name);
  const [sub, setSub] = useState("ESTATE & BUILDERS");
  const [address, setAddress] = useState(site.addressShort);
  const [phone, setPhone] = useState(site.phoneDisplay2);
  const [signature, setSignature] = useState(false);

  const rectW = mm * 1.5;
  const rectH = mm * 0.75;
  const copies = style === "round" ? 12 : 8;

  function download() {
    const el = document.getElementById(style === "round" ? "stamp-round" : "stamp-rect");
    if (!el) return;
    const xml = new XMLSerializer().serializeToString(el);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `5starm-stamp-${style}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
      <style>{PRINT_KIT_CSS}</style>
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Stamp</span>
          <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className={inputClass}>
            <option value="round">Round seal</option>
            <option value="rect">Rectangular stamp</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">Size: {style === "round" ? `${mm} mm round` : `${rectW} x ${rectH} mm`}</span>
          <input type="range" min={30} max={55} value={mm} onChange={(e) => setMm(Number(e.target.value))} />
        </label>
        {style === "round" ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Text along the top</span>
              <input value={top} onChange={(e) => setTop(e.target.value.toUpperCase())} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Text along the bottom</span>
              <input value={bottom} onChange={(e) => setBottom(e.target.value.toUpperCase())} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Centre</span>
              <input value={center} onChange={(e) => setCenter(e.target.value.toUpperCase())} className={inputClass} />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Line 2</span>
              <input value={sub} onChange={(e) => setSub(e.target.value.toUpperCase())} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </label>
            <label className="flex items-center gap-2.5 font-semibold text-ink">
              <input type="checkbox" checked={signature} onChange={(e) => setSignature(e.target.checked)} className="h-4 w-4 accent-primary" />
              Add &ldquo;Authorised signature&rdquo;
            </label>
          </>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            <Download className="h-4 w-4" /> Download design (SVG)
          </button>
          <button type="button" onClick={() => printIsolated(".pk-root")} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
            <Printer className="h-4 w-4" /> Print at real size
          </button>
        </div>
        <PrintTips extra="Give the SVG file to the stamp maker. The printed sheet is at real size, to check how it will look." />
      </div>

      <div className="pk-root overflow-x-auto">
        <div className="pk-sheet" style={{ padding: "20mm", display: "flex", flexWrap: "wrap", gap: "10mm", alignContent: "flex-start" }}>
          {Array.from({ length: copies }, (_, i) => (
            <div key={i}>{style === "round" ? <RoundSeal top={top} bottom={bottom} center={center} mm={mm} /> : <RectStamp name={name} sub={sub} address={address} phone={phone} signature={signature} w={rectW} h={rectH} />}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
