"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { site } from "@/lib/site";
import { PRINT_KIT_CSS, inputClass } from "./printKit";

// Flex banner designs, made to be sent to a flex printer:
//  - drawn at the real flex size, saved as a vector PDF of exactly that size plus the bleed;
//  - BLEED: the colours and the photo run past the trim line, so a small cutting error never
//    leaves a white edge (flex printers usually ask for 1 inch);
//  - SAFE ZONE: text and logos stay well inside the edge, away from the hem and the eyelets;
//  - GUIDES (screen only): the red dashed line is where the flex is cut, the blue one is the safe zone;
//  - PHOTO CHECK: tells how sharp the chosen photo will be at this size.
// Everything is sized from one unit u = 1/100 of the short side of the flex.

export interface FlexProperty {
  id: string;
  title: string;
  purpose: string;
  type: string;
  location: string;
  city: string;
  size: string;
  price: string;
  images: string[];
  features: string[];
  serialNo?: string;
}

const SIZES = [
  { label: "2 x 3 ft", a: 2, b: 3 },
  { label: "3 x 4 ft", a: 3, b: 4 },
  { label: "3 x 6 ft", a: 3, b: 6 },
  { label: "4 x 6 ft", a: 4, b: 6 },
  { label: "4 x 8 ft", a: 4, b: 8 },
  { label: "5 x 10 ft", a: 5, b: 10 },
  { label: "6 x 12 ft", a: 6, b: 12 },
];
const FT = 304.8;
const IN = 25.4;
/** Text and logos stay at least this far (mm) inside the cut edge: the hem and eyelets use about 1 inch. */
const SAFE_MM = 50;

const DEFAULT_SERVICES = ["Buy & Sell Property", "Rent & Property Management", "House Construction", "Legal & Documentation"].join("\n");
const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

function headlineFor(purpose: string) {
  return purpose === "For Rent" ? "FOR RENT" : purpose === "Investment" ? "INVESTMENT" : "FOR SALE";
}

export function FlexMaker({ properties, qrWebsite, qrWhatsapp, initialPropertyId }: { properties: FlexProperty[]; qrWebsite: string; qrWhatsapp: string; initialPropertyId?: string }) {
  const [mode, setMode] = useState<"company" | "property">("property");
  const [sizeIdx, setSizeIdx] = useState(2);
  const [portrait, setPortrait] = useState(false);
  const [bleedIn, setBleedIn] = useState(1);
  const [guides, setGuides] = useState(true);
  const [qr, setQr] = useState<"whatsapp" | "website" | "none">("whatsapp");
  const [phone, setPhone] = useState(site.phoneDisplay2);
  const [extra, setExtra] = useState("");

  // company flex
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [theme, setTheme] = useState<"red" | "dark">("red");

  // property flex
  const [propId, setPropId] = useState("");
  const [headline, setHeadline] = useState("FOR SALE");
  const [title, setTitle] = useState("10 Marla House");
  const [where, setWhere] = useState("Johar Town, Lahore");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [features, setFeatures] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoPx, setPhotoPx] = useState<{ w: number; h: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.2);

  const sz = SIZES[sizeIdx];
  const W = (portrait ? sz.a : sz.b) * FT; // the flex after cutting
  const H = (portrait ? sz.b : sz.a) * FT;
  const B = bleedIn * IN; // bleed on every side
  const FW = W + 2 * B; // the whole artwork (what is printed)
  const FH = H + 2 * B;
  const u = Math.min(W, H) / 100;
  const U = (n: number) => `${(n * u).toFixed(2)}mm`;
  const mm = (n: number) => `${n.toFixed(2)}mm`;
  // side and top padding that never goes below the safe zone
  const P = Math.max(5 * u, SAFE_MM);
  const PT = Math.max(4 * u, SAFE_MM);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setZoom(Math.min(1, (el.clientWidth - 4) / (FW * 3.7795)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [FW]);

  // how big the photo is in pixels (for the sharpness check)
  useEffect(() => {
    if (!photo) {
      setPhotoPx(null);
      return;
    }
    const img = new Image();
    img.onload = () => setPhotoPx({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setPhotoPx(null);
    img.src = photo;
  }, [photo]);

  function pickProperty(id: string) {
    setPropId(id);
    const p = properties.find((x) => x.id === id);
    if (!p) return;
    setHeadline(headlineFor(p.purpose));
    setTitle(p.title);
    setWhere([p.location, p.city].filter(Boolean).join(", "));
    setSize(p.size);
    setPrice(p.price);
    setFeatures(p.features.slice(0, 6).join("\n"));
    setPhoto(p.images[0] ?? "");
  }

  // opened from a property: its details are already filled in
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialPropertyId) pickProperty(initialPropertyId); }, []);

  function upload(file: File | undefined) {
    if (file && file.type.startsWith("image/")) setPhoto(URL.createObjectURL(file));
  }

  function printPdf() {
    // the browser proposes the document title as the PDF file name
    const old = document.title;
    const kind = mode === "company" ? "company" : (title || "property").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40);
    document.title = `5STAR-flex-${sz.label.replace(/ /g, "")}${portrait ? "-upright" : ""}-${kind}`;
    window.addEventListener("afterprint", () => (document.title = old), { once: true });
    window.print();
  }

  const qrSrc = qr === "whatsapp" ? qrWhatsapp : qr === "website" ? qrWebsite : null;
  const web = site.websiteUrl.replace(/^https?:\/\//, "");
  const landscape = W >= H;
  const selected = properties.find((p) => p.id === propId);
  // the phone number stays on one line, so its size follows the room it has (in units of u)
  const wU = W / u;
  const infoRoom = (landscape ? wU * 0.44 : wU) - 2 * (P / u) - (qrSrc ? 18 : 0);
  const phoneInfoFs = Math.max(3.5, Math.min(9.5, infoRoom / (Math.max(phone.length, 6) * 0.62)));
  const phoneBandFs = Math.max(4, Math.min(12, (wU - 2 * (P / u) - (qrSrc ? 26 : 0)) / (Math.max(phone.length, 6) * 0.62)));

  // photo sharpness: the photo covers its panel; dpi = pixels per inch it ends up with
  let dpi: number | null = null;
  if (photoPx && mode === "property") {
    const pw = landscape ? W * 0.56 + B : FW;
    const ph = landscape ? FH : H * 0.46 + B;
    dpi = IN / Math.max(pw / photoPx.w, ph / photoPx.h);
  }
  const dpiState = dpi === null ? null : dpi >= 100 ? "good" : dpi >= 60 ? "ok" : "low";

  const company = (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fff", color: "#1a1a1a" }}>
      <div
        style={{
          background: theme === "red" ? "#c81e2c" : "#17110f",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: U(5),
          margin: `${mm(-B)} ${mm(-B)} 0`,
          padding: `${mm(PT + B)} ${mm(P + B)} ${U(4)}`,
          borderBottom: `${U(2)} solid ${theme === "red" ? "#17110f" : "#c81e2c"}`,
        }}
      >
        <div style={{ background: "#fff", borderRadius: U(2), padding: `${U(1.5)} ${U(3)}`, flex: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt={site.name} style={{ height: U(18), width: "auto", display: "block" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: U(13), fontWeight: 900, lineHeight: 1, letterSpacing: U(0.3) }}>{site.name}</div>
          <div style={{ fontSize: U(6), fontWeight: 800, letterSpacing: U(0.8), marginTop: U(1) }}>ESTATE &amp; BUILDERS</div>
          <div style={{ fontSize: U(3.2), marginTop: U(1.5), letterSpacing: U(0.4), opacity: 0.95 }}>{site.taglineFull}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: `${U(5)} ${mm(P)}`, display: "flex", flexDirection: "column", justifyContent: "center", gap: U(3) }}>
        {extra && (
          <div dir="auto" className="pk-ur" style={{ fontSize: U(7), fontWeight: 800, textAlign: "center", marginBottom: U(2) }}>
            {extra}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: U(2.5), justifyContent: "center" }}>
          {lines(services).map((s, i) => (
            <div key={i} style={{ border: `${U(0.7)} solid #c81e2c`, borderRadius: U(2), padding: `${U(2)} ${U(4)}`, fontSize: U(5.2), fontWeight: 800 }}>
              <span style={{ color: "#c81e2c" }}>&#9679;&nbsp;</span>
              {s}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: U(5), fontWeight: 700, color: "#444", letterSpacing: U(0.4) }}>Buy &bull; Sell &bull; Rent &bull; Build in Lahore</div>
      </div>

      <div
        style={{
          background: "#17110f",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: U(4),
          margin: `0 ${mm(-B)} ${mm(-B)}`,
          padding: `${U(4)} ${mm(P + B)} ${mm(PT + B)}`,
          borderTop: `${U(2)} solid #c81e2c`,
        }}
      >
        <div>
          <div style={{ fontSize: U(4), opacity: 0.85 }}>Call / WhatsApp</div>
          <div style={{ fontSize: U(phoneBandFs), fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>{phone}</div>
          <div style={{ fontSize: U(3.6), marginTop: U(1.5), opacity: 0.92 }}>
            {site.address} &nbsp;|&nbsp; {web}
          </div>
        </div>
        {qrSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QR code" style={{ width: U(20), height: U(20), background: "#fff", padding: U(1), boxSizing: "border-box", flex: "none" }} />
        )}
      </div>
    </div>
  );

  const info = (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fff",
        color: "#1a1a1a",
        // the white panel runs into the bleed on the sides where it touches the edge
        margin: landscape ? `${mm(-B)} ${mm(-B)} ${mm(-B)} 0` : `0 ${mm(-B)} ${mm(-B)}`,
        padding: landscape ? `${mm(PT + B)} ${mm(P + B)} ${mm(PT + B)} ${mm(P)}` : `${U(4)} ${mm(P + B)} ${mm(PT + B)}`,
      }}
    >
      <div>
        <div dir="auto" style={{ fontSize: U(landscape ? 8 : 7), fontWeight: 900, lineHeight: 1.1 }}>{title}</div>
        {where && (
          <div dir="auto" style={{ fontSize: U(4.6), color: "#555", marginTop: U(1.5) }}>
            {where}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: U(2), marginTop: U(3) }}>
          {size && <div style={{ background: "#17110f", color: "#fff", borderRadius: U(1.5), padding: `${U(1)} ${U(3)}`, fontSize: U(4.6), fontWeight: 800 }}>{size}</div>}
          {price && <div style={{ background: "#c81e2c", color: "#fff", borderRadius: U(1.5), padding: `${U(1)} ${U(3)}`, fontSize: U(5.4), fontWeight: 900 }}>{price}</div>}
        </div>
        <div style={{ marginTop: U(3) }}>
          {lines(features).map((f, i) => (
            <div key={i} dir="auto" style={{ display: "flex", gap: U(2), fontSize: U(3.8), lineHeight: 1.35, marginBottom: U(0.8) }}>
              <span style={{ color: "#c81e2c", fontWeight: 900 }}>&#10003;</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
        {extra && (
          <div dir="auto" className="pk-ur" style={{ fontSize: U(5), fontWeight: 800, marginTop: U(2) }}>
            {extra}
          </div>
        )}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: U(3) }}>
          <div>
            <div style={{ fontSize: U(3.4), color: "#555" }}>Call / WhatsApp</div>
            <div style={{ fontSize: U(phoneInfoFs), fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>{phone}</div>
          </div>
          {qrSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt="QR code" style={{ width: U(15), height: U(15), border: `${U(0.5)} solid #1a1a1a`, flex: "none" }} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `${U(1.2)} solid #c81e2c`, marginTop: U(3), paddingTop: U(2.5), gap: U(3) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt={site.name} style={{ height: U(9), width: "auto" }} />
          <div style={{ textAlign: "right", fontSize: U(3), lineHeight: 1.4 }}>
            <div style={{ fontWeight: 800, fontSize: U(3.6) }}>{site.fullName}</div>
            <div>
              {site.addressShort} | {web}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const badgeSize = landscape ? 11 : 9;
  const propertyFlex = (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: landscape ? "row" : "column", background: "#fff" }}>
      <div
        style={{
          position: "relative",
          // the photo runs into the bleed on the sides where it touches the edge
          flex: landscape ? `0 0 calc(56% + ${mm(B)})` : `0 0 calc(46% + ${mm(B)})`,
          margin: landscape ? `${mm(-B)} 0 ${mm(-B)} ${mm(-B)}` : `${mm(-B)} ${mm(-B)} 0`,
          background: photo ? `#222 url("${photo}") center / cover no-repeat` : "linear-gradient(135deg,#c81e2c,#7a0f19)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            background: "#c81e2c",
            color: "#fff",
            fontWeight: 900,
            fontSize: U(badgeSize),
            letterSpacing: U(0.6),
            padding: `${mm(2 * u + B)} ${U(5)} ${U(2)} ${mm(5 * u + B)}`,
            borderBottomRightRadius: U(3),
            boxShadow: `0 ${U(0.6)} ${U(1.5)} rgba(0,0,0,.35)`,
          }}
        >
          {headline}
        </div>
        {!photo && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: U(3), padding: `${U(3)} ${U(6)}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt={site.name} style={{ height: U(22), width: "auto", display: "block" }} />
            </div>
          </div>
        )}
      </div>
      {info}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
      <style>{PRINT_KIT_CSS}</style>
      <style>{`@media print { @page { size: ${FW.toFixed(1)}mm ${FH.toFixed(1)}mm; margin: 0; } .fx-sheet { width: ${FW.toFixed(1)}mm !important; height: ${FH.toFixed(1)}mm !important; zoom: 1 !important; box-shadow: none !important; margin: 0 !important; } }`}</style>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
        <div className="flex gap-2">
          {(["property", "company"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded-full px-4 py-2 text-xs font-bold ${mode === m ? "bg-primary text-primary-foreground" : "border border-border text-ink hover:border-primary"}`}>
              {m === "property" ? "Property flex" : "Company flex"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Flex size (after cutting)</span>
            <select value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))} className={inputClass}>
              {SIZES.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Bleed (printer&apos;s extra)</span>
            <select value={bleedIn} onChange={(e) => setBleedIn(Number(e.target.value))} className={inputClass}>
              <option value={1}>1 inch (usual)</option>
              <option value={0.5}>0.5 inch</option>
              <option value={0}>None</option>
            </select>
          </label>
          <label className="col-span-2 flex items-center gap-2 font-semibold text-ink">
            <input type="checkbox" checked={portrait} onChange={(e) => setPortrait(e.target.checked)} className="h-4 w-4 accent-primary" />
            Upright (portrait)
          </label>
        </div>

        {mode === "property" ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Take details from one of our properties</span>
              <select value={propId} onChange={(e) => pickProperty(e.target.value)} className={inputClass}>
                <option value="">-</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.serialNo ? `${p.serialNo} - ` : ""}
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Heading</span>
              <select value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass}>
                {["FOR SALE", "FOR RENT", "TO LET", "INVESTMENT", "SOLD", "AVAILABLE"].map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. 10 Marla House)" className={inputClass} />
            <input dir="auto" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Location" className={inputClass} />
            <div className="grid grid-cols-2 gap-2.5">
              <input dir="auto" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size" className={inputClass} />
              <input dir="auto" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price / rent" className={inputClass} />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Features (one per line)</span>
              <textarea dir="auto" value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} className={inputClass} />
            </label>
            <div className="space-y-2">
              <span className="font-semibold text-ink">Photo</span>
              {selected && selected.images.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {selected.images.slice(0, 8).map((src) => (
                    <button key={src} type="button" onClick={() => setPhoto(src)} className={`h-12 w-16 overflow-hidden rounded border-2 ${photo === src ? "border-primary" : "border-border"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} className="text-xs" />
              {photo && (
                <button type="button" onClick={() => setPhoto("")} className="text-xs font-semibold text-primary hover:underline">
                  Remove the photo
                </button>
              )}
              {photoPx && dpi !== null && (
                <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${dpiState === "good" ? "bg-success/10 text-success" : dpiState === "ok" ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary"}`}>
                  Photo is {photoPx.w} x {photoPx.h} px - about {Math.round(dpi)} dpi at this flex size:{" "}
                  {dpiState === "good" ? "sharp, good for printing." : dpiState === "ok" ? "acceptable for a flex seen from a distance." : "too low, it will look blurry. Use a bigger photo or a smaller flex."}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Services (one per line)</span>
              <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={5} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold text-ink">Colour</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value as "red" | "dark")} className={inputClass}>
                <option value="red">Red top</option>
                <option value="dark">Dark top</option>
              </select>
            </label>
          </>
        )}

        <input dir="auto" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Extra line (Urdu or English, optional)" className={inputClass} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputClass} />
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-ink">QR code</span>
          <select value={qr} onChange={(e) => setQr(e.target.value as "whatsapp" | "website" | "none")} className={inputClass}>
            <option value="whatsapp">WhatsApp chat</option>
            <option value="website">Website</option>
            <option value="none">No QR code</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-semibold text-ink">
          <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-4 w-4 accent-primary" />
          Show cut and safe guides (not printed)
        </label>

        <button type="button" onClick={printPdf} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Printer className="h-4 w-4" /> Save print-ready PDF
        </button>

        <div className="space-y-1.5 rounded-lg bg-surface-muted p-3 text-xs text-muted">
          <p>
            <b className="text-ink">For the printer:</b> final flex <b>{sz.label}</b> ({Math.round(W / 10)} x {Math.round(H / 10)} cm
            {portrait ? ", upright" : ""}). The PDF is {Math.round(FW / 10)} x {Math.round(FH / 10)} cm because it includes {bleedIn ? `${bleedIn} inch bleed on every side` : "no bleed"}
            {bleedIn ? `; the cut line is ${bleedIn} inch inside the edge` : ""}.
          </p>
          <p>
            In the print window choose <b>Save as PDF</b>, keep the paper size as shown, Margins <b>None</b>, turn OFF &ldquo;Headers and footers&rdquo;, turn ON &ldquo;Background graphics&rdquo;. Text and logos stay sharp (vector); colours are RGB and the printer converts them for the flex machine. Text and logos are kept {Math.round(SAFE_MM / IN)} inches or more from the cut edge, away from the hem and the eyelets.
          </p>
        </div>
      </div>

      <div ref={wrapRef} className="pk-root min-w-0">
        <div className="pk-noprint mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          Preview - {sz.label} flex{bleedIn ? `, with ${bleedIn} inch bleed` : ""}
        </div>
        <div className="fx-sheet" style={{ position: "relative", width: mm(FW), height: mm(FH), zoom, boxShadow: "0 2px 12px rgba(0,0,0,.25)", overflow: "hidden", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
          <div style={{ position: "absolute", left: mm(B), top: mm(B), width: mm(W), height: mm(H) }}>{mode === "company" ? company : propertyFlex}</div>
          {guides && (
            <div className="pk-noprint" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: mm(B), top: mm(B), width: mm(W), height: mm(H), border: `${mm(1.2)} dashed #e00`, boxSizing: "border-box" }} />
              <div style={{ position: "absolute", left: mm(B + SAFE_MM), top: mm(B + SAFE_MM), width: mm(W - 2 * SAFE_MM), height: mm(H - 2 * SAFE_MM), border: `${mm(1.2)} dashed #06f`, boxSizing: "border-box" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
