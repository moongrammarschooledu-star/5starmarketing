"use client";

import { useEffect, useState } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";
import { site } from "@/lib/site";
import { printIsolated } from "./printKit";

// Business cards (90 x 50 mm): fill in the people, see the front and back, print 10 cards on an
// A4 sheet. The front has the name, contact lines, the company logo and a QR code; the back is
// the company card (logo, tagline, services). Print the fronts, then the backs (the same sheet
// turned over - the backs are all identical, so the sheet only has to be put back in the printer).
// Nothing is stored on the server; the list of people is remembered in this browser.

const STORE_KEY = "5starm_business_cards";
const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";
const PER_SHEET = 10;

interface Person {
  id: string;
  name: string;
  nameUr: string;
  designation: string;
  designationUr: string;
  mobile: string;
  mobile2: string;
  email: string;
  address: string;
  copies: number;
}

type QrKind = "website" | "whatsapp" | "none";
type Theme = "white" | "dark";

const newPerson = (copies = PER_SHEET): Person => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  nameUr: "",
  designation: "",
  designationUr: "",
  mobile: site.phoneDisplay2,
  mobile2: "",
  email: site.displayEmail,
  address: site.addressShort,
  copies,
});

const CSS = `
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Bold.ttf") format("truetype"); font-weight: 700; }
.bc-sheet { width: 210mm; height: 297mm; background: #fff; padding: 23.5mm 15mm; box-sizing: border-box; display: grid; grid-template-columns: repeat(2, 90mm); grid-auto-rows: 50mm; box-shadow: 0 2px 12px rgba(0,0,0,.2); -webkit-print-color-adjust: exact; print-color-adjust: exact; zoom: 0.55; margin-bottom: 14px; break-after: page; }
.bc-card { position: relative; width: 90mm; height: 50mm; overflow: hidden; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
.bc-cut .bc-card { outline: 0.2mm dashed #aaa; }
.bc-front.bc-white { background: #fff; color: #1a1a1a; }
.bc-front.bc-dark { background: #17110f; color: #fff; }
.bc-front .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 7mm; background: #c81e2c; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 4mm; font-size: 6.2pt; letter-spacing: .3px; }
.bc-front .logo { position: absolute; left: 4mm; top: 3.5mm; height: 11mm; width: auto; background: #fff; border-radius: 1mm; }
.bc-front .name { position: absolute; left: 4mm; top: 17mm; right: 24mm; font-weight: 700; font-size: 11.5pt; line-height: 1.15; }
.bc-front .desig { position: absolute; left: 4mm; top: 23mm; right: 24mm; font-size: 7.5pt; color: #c81e2c; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; }
.bc-dark .desig { color: #ff6b76; }
.bc-front .lines { position: absolute; left: 4mm; bottom: 9.5mm; right: 24mm; font-size: 7pt; line-height: 1.5; }
.bc-front .lines b { color: #c81e2c; margin-right: 1mm; }
.bc-dark .lines b { color: #ff6b76; }
.bc-front .ur { position: absolute; right: 4mm; top: 4mm; width: 40mm; text-align: right; direction: rtl; font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; font-size: 10pt; line-height: 2; }
.bc-front .ur small { display: block; font-size: 7.5pt; color: #c81e2c; }
.bc-front .qr { position: absolute; right: 4mm; bottom: 9mm; width: 17mm; height: 17mm; background: #fff; padding: 0.8mm; box-sizing: border-box; }
.bc-back { background: #c81e2c; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3mm; }
.bc-back .box { background: #fff; border-radius: 2mm; padding: 2mm 4mm; }
.bc-back .box img { height: 19mm; width: auto; display: block; }
.bc-back .tag { margin-top: 3mm; font-size: 7.5pt; font-weight: 700; letter-spacing: 1.2px; }
.bc-back .svc { margin-top: 1.5mm; font-size: 7pt; opacity: .95; }
.bc-back .addr { margin-top: 2mm; font-size: 6.2pt; opacity: .9; }
.bc-hide-back .bc-sheets-back, .bc-hide-front .bc-sheets-front { display: none; }
@media print {
  @page { size: A4; margin: 0; }
  /* everything around the design (sidebar, form) is taken out of the page, and its wrappers are unlocked, so nothing blank or cut is printed */
  [data-print-hide] { display: none !important; }
  [data-print-flow] { display: block !important; position: static !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; border: 0 !important; background: none !important; box-shadow: none !important; width: auto !important; max-width: none !important; transform: none !important; zoom: 1 !important; }
  .bc-sheet { zoom: 1 !important; box-shadow: none !important; margin: 0 !important; }
  .bc-printing-front .bc-sheets-back { display: none !important; }
  .bc-printing-back .bc-sheets-front { display: none !important; }
}
`;

function FrontCard({ p, qr, theme }: { p: Person | null; qr: string | null; theme: Theme }) {
  return (
    <div className={`bc-card bc-front bc-${theme}`}>
      {p && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/images/logo.png" alt={site.name} />
          {(p.nameUr || p.designationUr) && (
            <div className="ur">
              {p.nameUr}
              {p.designationUr && <small>{p.designationUr}</small>}
            </div>
          )}
          <div className="name">{p.name || "Your Name"}</div>
          {p.designation && <div className="desig">{p.designation}</div>}
          <div className="lines">
            {p.mobile && (
              <div>
                <b>Mob</b>
                {p.mobile}
                {p.mobile2 ? ` / ${p.mobile2}` : ""}
              </div>
            )}
            {p.email && (
              <div>
                <b>Email</b>
                {p.email}
              </div>
            )}
            {p.address && (
              <div>
                <b>Add</b>
                {p.address}
              </div>
            )}
          </div>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="qr" src={qr} alt="QR code" />
          )}
          <div className="bar">
            <span>{site.websiteUrl.replace(/^https?:\/\//, "")}</span>
            <span>{site.taglineFull}</span>
          </div>
        </>
      )}
    </div>
  );
}

function BackCard({ filled }: { filled: boolean }) {
  return (
    <div className="bc-card bc-back" style={filled ? undefined : { background: "#fff" }}>
      {filled && (
        <>
          <div className="box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt={site.name} />
          </div>
          <div className="tag">{site.taglineFull}</div>
          <div className="svc">Buy &bull; Sell &bull; Rent &bull; Build in Lahore</div>
          <div className="addr">
            {site.addressShort} &nbsp;|&nbsp; {site.phoneDisplay2} &nbsp;|&nbsp; {site.websiteUrl.replace(/^https?:\/\//, "")}
          </div>
        </>
      )}
    </div>
  );
}

export function BusinessCardMaker({ qrWebsite, qrWhatsapp }: { qrWebsite: string; qrWhatsapp: string }) {
  const [people, setPeople] = useState<Person[]>(() => [{ ...newPerson(), name: site.director, designation: site.directorTitle }]);
  const [qrKind, setQrKind] = useState<QrKind>("website");
  const [theme, setTheme] = useState<Theme>("white");
  const [cutLines, setCutLines] = useState(true);
  const [printing, setPrinting] = useState<"front" | "back" | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (Array.isArray(v.people) && v.people.length) setPeople(v.people);
        if (v.qrKind) setQrKind(v.qrKind);
        if (v.theme) setTheme(v.theme);
        if (typeof v.cutLines === "boolean") setCutLines(v.cutLines);
      }
    } catch {
      /* no saved cards */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ people, qrKind, theme, cutLines }));
    } catch {
      /* private window - not remembered */
    }
  }, [people, qrKind, theme, cutLines, loaded]);

  const update = (id: string, patch: Partial<Person>) => setPeople((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const qr = qrKind === "website" ? qrWebsite : qrKind === "whatsapp" ? qrWhatsapp : null;

  // every person repeated as many times as asked, then cut into sheets of ten
  const cards: Person[] = people.flatMap((p) => Array.from({ length: Math.max(0, Math.min(PER_SHEET * 5, p.copies)) }, () => p));
  const sheets: (Person | null)[][] = [];
  for (let i = 0; i < Math.max(cards.length, 1); i += PER_SHEET) {
    const chunk: (Person | null)[] = cards.slice(i, i + PER_SHEET);
    while (chunk.length < PER_SHEET) chunk.push(null);
    sheets.push(chunk);
  }

  function printSide(side: "front" | "back") {
    setPrinting(side);
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done, { once: true });
    window.setTimeout(() => printIsolated(".bc-root"), 120);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
      <style>{CSS}</style>

      <div className="space-y-4">
        {people.map((p, idx) => (
          <div key={p.id} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Card {idx + 1}</h3>
              {people.length > 1 && (
                <button type="button" onClick={() => setPeople((all) => all.filter((x) => x.id !== p.id))} aria-label="Remove this card" className="rounded-full p-1.5 text-muted hover:bg-primary/10 hover:text-primary">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="Name" className={inputClass} />
              <input value={p.designation} onChange={(e) => update(p.id, { designation: e.target.value })} placeholder="Designation" className={inputClass} />
              <input dir="rtl" value={p.nameUr} onChange={(e) => update(p.id, { nameUr: e.target.value })} placeholder="نام (اردو، اختیاری)" className={`${inputClass} text-right`} />
              <input dir="rtl" value={p.designationUr} onChange={(e) => update(p.id, { designationUr: e.target.value })} placeholder="عہدہ (اردو، اختیاری)" className={`${inputClass} text-right`} />
              <input value={p.mobile} onChange={(e) => update(p.id, { mobile: e.target.value })} placeholder="Mobile" className={inputClass} />
              <input value={p.mobile2} onChange={(e) => update(p.id, { mobile2: e.target.value })} placeholder="2nd number (optional)" className={inputClass} />
              <input value={p.email} onChange={(e) => update(p.id, { email: e.target.value })} placeholder="Email" className={`${inputClass} col-span-2`} />
              <input value={p.address} onChange={(e) => update(p.id, { address: e.target.value })} placeholder="Address" className={`${inputClass} col-span-2`} />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-ink">
              Copies of this card
              <input type="number" min={0} max={50} value={p.copies} onChange={(e) => update(p.id, { copies: Number(e.target.value) })} className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary" />
            </label>
          </div>
        ))}

        <button type="button" onClick={() => setPeople((all) => [...all, newPerson(0)])} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Plus className="h-4 w-4" /> Add another person
        </button>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">QR code on the front</span>
            <select value={qrKind} onChange={(e) => setQrKind(e.target.value as QrKind)} className={inputClass}>
              <option value="website">Website ({site.websiteUrl.replace(/^https?:\/\//, "")})</option>
              <option value="whatsapp">WhatsApp chat</option>
              <option value="none">No QR code</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Front colour</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className={inputClass}>
              <option value="white">White</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5 font-semibold text-ink">
            <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} className="h-4 w-4 accent-primary" />
            Print thin cutting lines
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => printSide("front")} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
              <Printer className="h-4 w-4" /> Print front side
            </button>
            <button type="button" onClick={() => printSide("back")} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
              <Printer className="h-4 w-4" /> Print back side
            </button>
          </div>
          <p className="text-xs text-muted">
            Card size 90 x 50 mm, ten per A4 sheet. In the print window: paper A4, scale 100% (not &ldquo;fit to page&rdquo;), Margins &ldquo;None&rdquo;, turn OFF &ldquo;Headers and footers&rdquo; and turn ON &ldquo;Background graphics&rdquo;. For two-sided cards print the front, put the same sheet back into the printer, and print the back. Use 300 gsm card paper.
          </p>
        </div>
      </div>

      <div className={`bc-root ${cutLines ? "bc-cut" : ""} ${printing === "front" ? "bc-printing-front" : printing === "back" ? "bc-printing-back" : ""}`}>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Front side ({cards.length} card{cards.length === 1 ? "" : "s"}, {sheets.length} sheet{sheets.length === 1 ? "" : "s"})</div>
        <div className="bc-sheets-front overflow-x-auto">
          {sheets.map((chunk, i) => (
            <div key={`f${i}`} className="bc-sheet">
              {chunk.map((p, k) => (
                <FrontCard key={k} p={p} qr={qr} theme={theme} />
              ))}
            </div>
          ))}
        </div>
        <div className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted">Back side</div>
        <div className="bc-sheets-back overflow-x-auto">
          {sheets.map((chunk, i) => (
            <div key={`b${i}`} className="bc-sheet">
              {chunk.map((p, k) => (
                <BackCard key={k} filled={p !== null} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
