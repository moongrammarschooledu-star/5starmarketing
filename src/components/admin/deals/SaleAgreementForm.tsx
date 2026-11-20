"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Download, Loader2, Printer, Save, Trash2 } from "lucide-react";
import { saleProblems, type CommissionBy, type CostsBy, type SaleAgreementData, type SaleKind } from "@/lib/saleAgreement/types";
import type { AgreementParty } from "@/lib/rentAgreement/types";
import { groupLakh, numberToWordsEn } from "@/lib/rentAgreement/words";
import { deleteSaleAgreementAction, prefillSaleFromPropertyAction, saveSaleAgreementAction } from "@/lib/actions/saleAgreements.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { RecordPicker } from "@/components/admin/documents/RecordPicker";
import { Field, Pair, PartyFields, Section, inputClass as input, inputUrClass as inputUr } from "@/components/admin/rentals/agreementFormParts";
import type { DocumentTarget } from "@/lib/models/document";

const OPTION_LABELS: { key: keyof SaleAgreementData["options"]; label: string }[] = [
  { key: "clearTitle", label: "Seller declares he is the sole owner and the property is free from mortgage, litigation and claims" },
  { key: "duesCleared", label: "Seller pays all bills, taxes and society dues up to the date of possession" },
  { key: "noThirdParty", label: "Seller will not sell, mortgage or transfer the property to anyone else meanwhile" },
  { key: "buyerDefaultForfeit", label: "If the buyer does not pay the balance on time, the seller may cancel (advance forfeited)" },
  { key: "sellerDefaultDouble", label: "If the seller does not do the registry or breaks the deal, he returns DOUBLE the advance" },
  { key: "documentsHandover", label: "Seller hands over all original papers (fard, registry / allotment) at the registry" },
  { key: "courtsClause", label: "Pakistani law applies; the courts of the city decide any dispute" },
];

export function SaleAgreementForm({
  id,
  agreementNo,
  initial,
  propertyId: initialPropertyId,
  properties,
}: {
  id?: string;
  agreementNo?: string;
  initial: SaleAgreementData;
  propertyId?: string;
  properties: { id: string; title: string }[];
}) {
  const [d, setD] = useState<SaleAgreementData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const router = useRouter();
  const toast = useToast();

  const set = (patch: Partial<SaleAgreementData>) => setD((x) => ({ ...x, ...patch }));
  const setSeller = (patch: Partial<AgreementParty>) => setD((x) => ({ ...x, seller: { ...x.seller, ...patch } }));
  const setBuyer = (patch: Partial<AgreementParty>) => setD((x) => ({ ...x, buyer: { ...x.buyer, ...patch } }));
  const setProp = (patch: Partial<SaleAgreementData["property"]>) => setD((x) => ({ ...x, property: { ...x.property, ...patch } }));
  const setWitness = (i: number, patch: Partial<SaleAgreementData["witnesses"][number]>) =>
    setD((x) => ({ ...x, witnesses: x.witnesses.map((w, k) => (k === i ? { ...w, ...patch } : w)) }));

  function fromContact(who: "seller" | "buyer", t: DocumentTarget | null) {
    if (!t) return;
    const patch = { name: t.label, phone: t.sub ?? "" };
    if (who === "seller") setSeller(patch);
    else setBuyer(patch);
  }

  function fillFromProperty(pid: string) {
    setPropertyId(pid);
    if (!pid) return;
    startTransition(async () => {
      try {
        const p = await prefillSaleFromPropertyAction(pid);
        if (!p) return;
        setD((x) => ({
          ...x,
          seller: p.seller ? { ...x.seller, ...Object.fromEntries(Object.entries(p.seller).filter(([, v]) => v)) } : x.seller,
          property: p.property ? { ...x.property, ...p.property } : x.property,
          totalPrice: p.totalPrice && !x.totalPrice ? p.totalPrice : x.totalPrice,
        }));
        toast.show("Property and seller details filled in.");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not load that property.");
      }
    });
  }

  function save(then: "print" | "word" | "none") {
    setError(null);
    const problems = saleProblems(d);
    if (problems.length) return setError(problems[0]);
    // The print tab is opened right now (a browser allows that only straight after a click) and filled in once saved.
    const printTab = then === "print" ? window.open("", "_blank") : null;
    startTransition(async () => {
      try {
        const saved = await saveSaleAgreementAction(id ?? null, d, propertyId || undefined);
        toast.show("Agreement saved.");
        if (printTab) printTab.location.href = `/admin/deals/sale-agreements/${saved.id}/print`;
        if (then === "word") {
          const a = document.createElement("a");
          a.href = `/admin/deals/sale-agreements/${saved.id}/docx`;
          a.download = `sale-agreement-${saved.agreementNo}.docx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        if (!id) router.push(`/admin/deals/sale-agreements/${saved.id}`);
        else router.refresh();
      } catch (e) {
        printTab?.close();
        setError(e instanceof Error ? e.message : "Could not save this agreement.");
      }
    });
  }

  function remove() {
    if (!id || !window.confirm("Delete this sale agreement? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteSaleAgreementAction(id);
        router.push("/admin/deals/sale-agreements");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
      }
    });
  }

  const balance = Math.max(0, d.totalPrice - d.advancePaid);
  const priceWords = d.totalPrice > 0 ? `${numberToWordsEn(d.totalPrice)} Rupees Only (Rs. ${groupLakh(d.totalPrice)}/-)` : "";

  return (
    <div className="space-y-5">
      <Section title="Language and paper" hint="The whole agreement is written in the language you choose. You can change this later and print again.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Language">
            <select value={d.language} onChange={(e) => set({ language: e.target.value as SaleAgreementData["language"] })} className={input}>
              <option value="ur">Urdu (اردو) - the whole agreement in Urdu</option>
              <option value="en">English - the whole agreement in English</option>
            </select>
          </Field>
          <Field label="Paper" hint={d.paper === "stamp" ? "Legal page. The top of the first page is left empty so it prints straight onto the stamp paper." : "A4 page. Prints with the company logo and details at the top of every page."}>
            <select value={d.paper} onChange={(e) => set({ paper: e.target.value as SaleAgreementData["paper"], pageSize: e.target.value === "stamp" ? "legal" : "a4" })} className={input}>
              <option value="plain">Company letterhead paper (A4)</option>
              <option value="stamp">Stamp paper (Legal, top left empty for the stamp)</option>
            </select>
          </Field>

          <Field label="Agreement date">
            <input type="date" value={d.agreementDate} onChange={(e) => set({ agreementDate: e.target.value })} className={input} />
          </Field>
          <Pair label="Place" en={d.place} ur={d.placeUr} onEn={(v) => set({ place: v })} onUr={(v) => set({ placeUr: v })} />
        </div>
      </Section>

      <PartyFields
        title="Seller (First Party - owner of the property)"
        party={d.seller}
        onChange={setSeller}
        picker={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fill from one of our properties">
              <select value={propertyId} onChange={(e) => fillFromProperty(e.target.value)} className={input}>
                <option value="">-</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <RecordPicker kind="contact" label="Or pick from Customer Contacts" value={null} onChange={(t) => fromContact("seller", t)} />
          </div>
        }
      />

      <PartyFields title="Buyer (Second Party)" party={d.buyer} onChange={setBuyer} picker={<RecordPicker kind="contact" label="Pick from Customer Contacts" value={null} onChange={(t) => fromContact("buyer", t)} />} />

      <Section title="Property">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select value={d.property.kind} onChange={(e) => setProp({ kind: e.target.value as SaleKind })} className={input}>
              <option value="House">House (مکان)</option>
              <option value="Plot">Plot (پلاٹ)</option>
              <option value="Flat">Flat (فلیٹ)</option>
              <option value="Shop">Shop (دکان)</option>
              <option value="Commercial">Commercial property (کمرشل)</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>
        <Pair label="House / plot number and street" en={d.property.description} ur={d.property.descriptionUr} onEn={(v) => setProp({ description: v })} onUr={(v) => setProp({ descriptionUr: v })} textarea />
        <Pair label="Area / society" en={d.property.area} ur={d.property.areaUr} onEn={(v) => setProp({ area: v })} onUr={(v) => setProp({ areaUr: v })} />
        <Pair label="City" en={d.property.city} ur={d.property.cityUr} onEn={(v) => setProp({ city: v })} onUr={(v) => setProp({ cityUr: v })} />
        <Pair label="Size (e.g. 10 Marla, 1 Kanal)" en={d.property.size} ur={d.property.sizeUr} onEn={(v) => setProp({ size: v })} onUr={(v) => setProp({ sizeUr: v })} />
        <Pair label="Ownership papers (fard / registry / allotment no., khasra...)" en={d.property.titleDetails} ur={d.property.titleDetailsUr} onEn={(v) => setProp({ titleDetails: v })} onUr={(v) => setProp({ titleDetailsUr: v })} textarea />
      </Section>

      <Section title="Price and payment">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Total price (Rs.)" hint={priceWords}>
            <input type="number" min={0} value={d.totalPrice || ""} onChange={(e) => set({ totalPrice: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Advance / bayana paid (Rs.)" hint={d.advancePaid > 0 ? `Balance to pay: Rs. ${groupLakh(balance)}/-` : "0 = no advance"}>
            <input type="number" min={0} value={d.advancePaid || ""} onChange={(e) => set({ advancePaid: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Advance paid on">
            <input type="date" value={d.advanceDate} onChange={(e) => set({ advanceDate: e.target.value })} className={input} />
          </Field>
          <Field label="Bayana receipt number (optional)" hint="e.g. TR-000012">
            <input value={d.advanceReceiptNo} onChange={(e) => set({ advanceReceiptNo: e.target.value })} className={input} />
          </Field>
          <Field label="Registry / balance payment by">
            <input type="date" value={d.balanceDueDate} onChange={(e) => set({ balanceDueDate: e.target.value })} className={input} />
          </Field>
          <Field label="Possession date" hint="Empty = at the registry and full payment">
            <input type="date" value={d.possessionDate} onChange={(e) => set({ possessionDate: e.target.value })} className={input} />
          </Field>
          <Field label="Registry / transfer costs paid by">
            <select value={d.transferCostsBy} onChange={(e) => set({ transferCostsBy: e.target.value as CostsBy })} className={input}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="half">Half each</option>
            </select>
          </Field>
          <Field label="Dealer commission (%)" hint="0 = no commission clause">
            <input type="number" min={0} max={20} step="0.25" value={d.commissionPercent || ""} onChange={(e) => set({ commissionPercent: Number(e.target.value) })} className={input} />
          </Field>
          {d.commissionPercent > 0 && (
            <Field label="Commission paid by">
              <select value={d.commissionBy} onChange={(e) => set({ commissionBy: e.target.value as CommissionBy })} className={input}>
                <option value="both">Both seller and buyer (each)</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </Field>
          )}
        </div>
      </Section>

      <Section title="Terms to include" hint="Tick the standard terms you want in this agreement.">
        <div className="space-y-2">
          {OPTION_LABELS.map((o) => (
            <label key={o.key} className="flex items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={d.options[o.key]} onChange={(e) => set({ options: { ...d.options, [o.key]: e.target.checked } })} className="mt-1 h-4 w-4 accent-primary" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <Field label="Extra terms (one per line)" hint="Printed exactly as you type them (in Urdu or English) after the standard terms.">
          <textarea value={d.extraTerms} onChange={(e) => set({ extraTerms: e.target.value })} rows={4} className={input} />
        </Field>
      </Section>

      <Section title="Witnesses" hint="Optional. Leave empty to write the names by hand after printing.">
        {[0, 1].map((i) => (
          <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={`Witness ${i + 1} name`}>
              <input value={d.witnesses[i].name} onChange={(e) => setWitness(i, { name: e.target.value })} className={input} />
            </Field>
            <Field label="نام (اردو)">
              <input dir="rtl" value={d.witnesses[i].nameUr} onChange={(e) => setWitness(i, { nameUr: e.target.value })} className={inputUr} />
            </Field>
            <Field label="CNIC">
              <input value={d.witnesses[i].cnic} onChange={(e) => setWitness(i, { cnic: e.target.value })} className={input} />
            </Field>
          </div>
        ))}
      </Section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
        <button type="button" onClick={() => save("print")} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Save &amp; Print / Save as PDF
        </button>
        <button type="button" onClick={() => save("word")} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
          <Download className="h-4 w-4" /> Save &amp; download Word (.docx)
        </button>
        <button type="button" onClick={() => save("none")} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
          <Save className="h-4 w-4" /> Save only
        </button>
        {id && (
          <button type="button" onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-60">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
        {agreementNo && <span className="text-xs font-semibold text-muted">{agreementNo}</span>}
      </div>
    </div>
  );
}
