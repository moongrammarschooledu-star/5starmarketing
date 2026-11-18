"use client";

import { useEffect, useState } from "react";
import { Printer, RotateCcw } from "lucide-react";
import { site } from "@/lib/site";

// Writes a letter on the company letterhead and prints it (or saves it as PDF). Nothing is
// stored on the server: the draft is only remembered in this browser. "Blank letterhead"
// prints just the header and footer, to use as printed stationery.

const DRAFT_KEY = "5starm_letterhead_draft";
const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";

interface Draft {
  lang: "en" | "ur";
  blank: boolean;
  date: string;
  refNo: string;
  toName: string;
  toAddress: string;
  subject: string;
  body: string;
  signName: string;
  signTitle: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyDraft = (): Draft => ({
  lang: "en",
  blank: false,
  date: today(),
  refNo: "",
  toName: "",
  toAddress: "",
  subject: "",
  body: "",
  signName: site.director,
  signTitle: site.directorTitle,
});

function fmt(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

const CSS = `
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Noto Nastaliq Urdu"; src: url("/fonts/NotoNastaliqUrdu-Bold.ttf") format("truetype"); font-weight: 700; }
.lh-wrap { overflow-x: auto; }
.lh-sheet { position: relative; width: 210mm; min-height: 297mm; background: #fff; color: #1a1a1a; padding: 14mm 18mm 26mm; box-sizing: border-box; box-shadow: 0 2px 12px rgba(0,0,0,.2); -webkit-print-color-adjust: exact; print-color-adjust: exact; zoom: 0.62; }
.lh-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.6px solid #c81e2c; padding-bottom: 5mm; direction: ltr; font-family: Arial, Helvetica, sans-serif; }
.lh-head img { height: 22mm; width: auto; }
.lh-co { text-align: right; line-height: 1.45; }
.lh-co b { display: block; font-size: 17pt; letter-spacing: .3px; }
.lh-co .tag { display: block; font-size: 8pt; color: #c81e2c; letter-spacing: 1.4px; font-weight: 700; margin: 1px 0 3px; }
.lh-co span { display: block; font-size: 9pt; color: #444; }
/* the body fills the page, so the signature block sits at the bottom, above the footer */
.lh-body { padding-top: 9mm; min-height: 215mm; display: flex; flex-direction: column; }
.lh-en { font: 12pt/1.6 "Times New Roman", Times, serif; }
.lh-ur { font: 14pt/2.4 "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif; }
.lh-meta { display: flex; justify-content: space-between; font: 600 10.5pt Arial, Helvetica, sans-serif; margin-bottom: 7mm; direction: ltr; }
.lh-to { margin-bottom: 5mm; white-space: pre-wrap; }
.lh-subject { font-weight: 700; text-decoration: underline; margin-bottom: 5mm; }
.lh-text { white-space: pre-wrap; text-align: justify; }
.lh-sign { margin-top: auto; padding-top: 12mm; align-self: flex-end; min-width: 62mm; text-align: center; }
.lh-sign .line { border-top: 0.3mm solid #1a1a1a; margin-top: 18mm; padding-top: 2mm; }
.lh-foot { position: absolute; left: 18mm; right: 18mm; bottom: 9mm; border-top: 1.5px solid #c81e2c; padding-top: 3mm; text-align: center; font: 8.5pt/1.5 Arial, Helvetica, sans-serif; color: #444; direction: ltr; }
@media print {
  @page { size: A4; margin: 0; }
  body * { visibility: hidden !important; }
  #lh-print, #lh-print * { visibility: visible !important; }
  #lh-print { position: absolute; left: 0; top: 0; }
  .lh-sheet { zoom: 1 !important; box-shadow: none !important; }
}
`;

export function LetterheadMaker() {
  const [d, setD] = useState<Draft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setD((x) => ({ ...x, ...JSON.parse(raw), date: today() }));
    } catch {
      /* no saved draft */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* private window - the draft is simply not remembered */
    }
  }, [d, loaded]);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const ur = d.lang === "ur";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
      <style>{CSS}</style>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <input type="checkbox" checked={d.blank} onChange={(e) => set({ blank: e.target.checked })} className="h-4 w-4 accent-primary" />
          Blank letterhead (header and footer only)
        </label>

        {!d.blank && (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Language of the letter</span>
              <select value={d.lang} onChange={(e) => set({ lang: e.target.value as "en" | "ur" })} className={inputClass}>
                <option value="en">English</option>
                <option value="ur">Urdu (اردو)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Date</span>
                <input type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Reference no.</span>
                <input value={d.refNo} onChange={(e) => set({ refNo: e.target.value })} placeholder="optional" className={inputClass} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">To (name and address)</span>
              <textarea dir="auto" value={`${d.toName}${d.toAddress ? `\n${d.toAddress}` : ""}`} onChange={(e) => {
                const [first, ...rest] = e.target.value.split("\n");
                set({ toName: first ?? "", toAddress: rest.join("\n") });
              }} rows={3} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Subject</span>
              <input dir="auto" value={d.subject} onChange={(e) => set({ subject: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Letter</span>
              <textarea dir="auto" value={d.body} onChange={(e) => set({ body: e.target.value })} rows={10} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Signed by</span>
                <input dir="auto" value={d.signName} onChange={(e) => set({ signName: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Designation</span>
                <input dir="auto" value={d.signTitle} onChange={(e) => set({ signTitle: e.target.value })} className={inputClass} />
              </label>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
          <button type="button" onClick={() => window.confirm("Clear this letter?") && setD(emptyDraft())} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
        </div>
        <p className="text-xs text-muted">
          In the print window: choose your printer (or &ldquo;Save as PDF&rdquo;), paper A4, Margins &ldquo;None&rdquo;, turn OFF &ldquo;Headers and footers&rdquo; and turn ON &ldquo;Background graphics&rdquo;. The letter is not stored on the server - only remembered in this browser.
        </p>
      </div>

      <div className="lh-wrap">
        <div id="lh-print">
          <div className="lh-sheet">
            <div className="lh-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt={site.name} />
              <div className="lh-co">
                <b>{site.fullName}</b>
                <span className="tag">{site.taglineFull}</span>
                <span>{site.address}</span>
                <span>
                  {site.phoneDisplay2} &nbsp;|&nbsp; {site.displayEmail}
                </span>
                <span>{site.websiteUrl.replace(/^https?:\/\//, "")}</span>
              </div>
            </div>

            {!d.blank && (
              <div className={`lh-body ${ur ? "lh-ur" : "lh-en"}`} dir={ur ? "rtl" : "ltr"}>
                <div className="lh-meta">
                  <span>{d.refNo ? `Ref: ${d.refNo}` : ""}</span>
                  <span>Date: {fmt(d.date)}</span>
                </div>
                {(d.toName || d.toAddress) && (
                  <div className="lh-to" dir="auto">
                    {ur ? "بخدمت: " : "To: "}
                    {d.toName}
                    {d.toAddress ? `\n${d.toAddress}` : ""}
                  </div>
                )}
                {d.subject && (
                  <div className="lh-subject" dir="auto">
                    {ur ? "موضوع: " : "Subject: "}
                    {d.subject}
                  </div>
                )}
                <div className="lh-text" dir="auto">
                  {d.body}
                </div>
                {(d.signName || d.signTitle) && (
                  <div className="lh-sign" dir="auto">
                    <div className="line">
                      <div style={{ fontWeight: 700 }}>{d.signName}</div>
                      <div>{d.signTitle}</div>
                      <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt" }} dir="ltr">
                        {site.fullName}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="lh-foot">
              {site.address} &nbsp;|&nbsp; {site.phoneDisplay2} &nbsp;|&nbsp; {site.displayEmail} &nbsp;|&nbsp; {site.websiteUrl.replace(/^https?:\/\//, "")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
