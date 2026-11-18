"use client";

import { useState } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";
import { site } from "@/lib/site";
import { PRINT_KIT_CSS, PrintTips, inputClass } from "./printKit";

// Staff ID cards (85.6 x 54 mm, the standard card size): name, designation, ID number, phone,
// blood group and a photo (the photo stays in this browser only). Eight cards per A4 sheet,
// front and back. Photos are not remembered after the page is closed.

interface Person {
  id: string;
  name: string;
  designation: string;
  idNo: string;
  phone: string;
  blood: string;
  photo: string;
}

const newPerson = (): Person => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: "", designation: "", idNo: "", phone: "", blood: "", photo: "" });

const PER_SHEET = 8;

function Front({ p }: { p: Person | null }) {
  return (
    <div style={{ width: "85.6mm", height: "54mm", background: "#fff", border: "0.3mm solid #ccc", borderRadius: "3mm", overflow: "hidden", position: "relative", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {p && (
        <>
          <div style={{ background: "#c81e2c", height: "13mm", display: "flex", alignItems: "center", gap: "3mm", padding: "0 3mm", color: "#fff" }}>
            <div style={{ background: "#fff", borderRadius: "1mm", padding: "0.5mm 1.5mm" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt={site.name} style={{ height: "9mm", width: "auto", display: "block" }} />
            </div>
            <div style={{ fontSize: "8pt", fontWeight: 800, lineHeight: 1.25 }}>
              {site.fullName}
              <div style={{ fontSize: "5.5pt", fontWeight: 400, letterSpacing: "0.5px" }}>STAFF IDENTITY CARD</div>
            </div>
          </div>
          <div style={{ position: "absolute", left: "4mm", top: "16.5mm", width: "22mm", height: "27mm", border: "0.3mm solid #999", background: "#f1f1f1", overflow: "hidden" }}>
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: "6pt", color: "#999", textAlign: "center", paddingTop: "11mm" }}>PHOTO</div>
            )}
          </div>
          <div style={{ position: "absolute", left: "30mm", top: "17mm", right: "3mm" }}>
            <div style={{ fontSize: "11pt", fontWeight: 800, lineHeight: 1.15 }}>{p.name || "Name"}</div>
            <div style={{ fontSize: "7.5pt", fontWeight: 700, color: "#c81e2c", textTransform: "uppercase", marginTop: "1mm" }}>{p.designation}</div>
            <div style={{ fontSize: "7pt", lineHeight: 1.7, marginTop: "2.5mm" }}>
              {p.idNo && (
                <div>
                  <b>ID No:</b> {p.idNo}
                </div>
              )}
              {p.phone && (
                <div>
                  <b>Phone:</b> {p.phone}
                </div>
              )}
              {p.blood && (
                <div>
                  <b>Blood group:</b> {p.blood}
                </div>
              )}
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "3mm", background: "#17110f" }} />
        </>
      )}
    </div>
  );
}

function Back({ filled }: { filled: boolean }) {
  return (
    <div style={{ width: "85.6mm", height: "54mm", background: "#fff", border: "0.3mm solid #ccc", borderRadius: "3mm", overflow: "hidden", position: "relative", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif", padding: "5mm" }}>
      {filled && (
        <>
          <div style={{ fontSize: "7pt", lineHeight: 1.5, color: "#333" }}>
            This card is the property of <b>{site.fullName}</b>. If found, please return it to:
            <div style={{ marginTop: "1.5mm" }}>{site.address}</div>
            <div>Phone: {site.phoneDisplay2}</div>
            <div>{site.websiteUrl.replace(/^https?:\/\//, "")}</div>
          </div>
          <div style={{ position: "absolute", left: "5mm", right: "5mm", bottom: "5mm", display: "flex", justifyContent: "space-between", fontSize: "6pt", color: "#555" }}>
            <div style={{ borderTop: "0.3mm solid #333", paddingTop: "1mm", width: "34mm" }}>Holder&apos;s signature</div>
            <div style={{ borderTop: "0.3mm solid #333", paddingTop: "1mm", width: "34mm", textAlign: "right" }}>Authorised signature</div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "3mm", background: "#c81e2c" }} />
        </>
      )}
    </div>
  );
}

export function IdCardMaker() {
  const [people, setPeople] = useState<Person[]>([newPerson()]);
  const [printing, setPrinting] = useState<"front" | "back" | null>(null);

  const update = (id: string, patch: Partial<Person>) => setPeople((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const sheets: (Person | null)[][] = [];
  for (let i = 0; i < people.length; i += PER_SHEET) {
    const chunk: (Person | null)[] = people.slice(i, i + PER_SHEET);
    while (chunk.length < PER_SHEET) chunk.push(null);
    sheets.push(chunk);
  }

  function printSide(side: "front" | "back") {
    setPrinting(side);
    window.addEventListener("afterprint", () => setPrinting(null), { once: true });
    window.setTimeout(() => window.print(), 120);
  }

  function pickPhoto(id: string, file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    update(id, { photo: URL.createObjectURL(file) });
  }

  const grid = { padding: "36mm 19.4mm", display: "grid", gridTemplateColumns: "repeat(2, 85.6mm)", gridAutoRows: "54mm", gap: "3mm" } as const;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
      <style>{PRINT_KIT_CSS}</style>
      <div className="space-y-4">
        {people.map((p, idx) => (
          <div key={p.id} className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
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
              <input value={p.idNo} onChange={(e) => update(p.id, { idNo: e.target.value })} placeholder="ID number" className={inputClass} />
              <input value={p.phone} onChange={(e) => update(p.id, { phone: e.target.value })} placeholder="Phone" className={inputClass} />
              <input value={p.blood} onChange={(e) => update(p.id, { blood: e.target.value })} placeholder="Blood group (optional)" className={inputClass} />
              <input type="file" accept="image/*" onChange={(e) => pickPhoto(p.id, e.target.files?.[0])} className="text-xs" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setPeople((all) => [...all, newPerson()])} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Plus className="h-4 w-4" /> Add another card
        </button>
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => printSide("front")} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
              <Printer className="h-4 w-4" /> Print fronts
            </button>
            <button type="button" onClick={() => printSide("back")} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
              <Printer className="h-4 w-4" /> Print backs
            </button>
          </div>
          <PrintTips extra="Card size 85.6 x 54 mm, eight per sheet. Print on thick card paper and cut, or give the PDF to a card printer. Photos are used in this browser only and are not saved." />
        </div>
      </div>

      <div className={`pk-root overflow-x-auto ${printing === "front" ? "pk-printing-front" : printing === "back" ? "pk-printing-back" : ""}`}>
        <div className="pk-front">
          {sheets.map((chunk, i) => (
            <div key={`f${i}`} className="pk-sheet" style={grid}>
              {chunk.map((p, k) => (
                <Front key={k} p={p} />
              ))}
            </div>
          ))}
        </div>
        <div className="pk-back">
          {sheets.map((chunk, i) => (
            <div key={`b${i}`} className="pk-sheet" style={grid}>
              {chunk.map((p, k) => (
                <Back key={k} filled={p !== null} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
